import { createHash } from "node:crypto";
import {
  configSchema,
  jobSchema,
  durationMs,
  SandboxError,
  type SandboxConfig,
  type Job,
  type RunStatus,
  type Output,
} from "../sandbox/types.js";
import { Store } from "./store.js";

export type Workspace = {
  id: string;
  config: SandboxConfig;
  createdAt: number;
  expiresAt: number;
  providerId?: string;
  state: "pending" | "ready" | "suspended" | "destroyed" | "expired";
};
export type ServiceRun = {
  id: string;
  workspaceId: string;
  job: Job;
  fingerprint: string;
  status: RunStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  cancelRequested?: boolean;
  submitted?: boolean;
  error?: string;
  stdout: Output;
  stderr: Output;
  exitCode: number | null;
  durationMs: number;
};
export type Observation = {
  status: RunStatus;
  exitCode: number | null;
  durationMs: number;
  error?: string;
  stdout: Output;
  stderr: Output;
};
export interface Provider {
  ensure(name: string, config: SandboxConfig): Promise<string>;
  resume(id: string): Promise<void>;
  suspend(id: string): Promise<void>;
  idle?(id: string, minutes: number): Promise<void>;
  destroy(id: string): Promise<void>;
  stage(id: string, runId: string, job: Job): Promise<void>;
  submit(id: string, runId: string): Promise<void>;
  observe(id: string, runId: string): Promise<Observation | null>;
  cancel(id: string, runId: string): Promise<void>;
  read(id: string, path: string, maxBytes: number): Promise<Uint8Array>;
  write(id: string, path: string, contents: Uint8Array): Promise<void>;
}
export function terminal(status: RunStatus) {
  return status !== "queued" && status !== "running";
}
function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export class Engine {
  private locks = new Map<string, Promise<unknown>>();
  constructor(
    readonly store: Store,
    readonly provider: Provider,
  ) {}
  async exclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(fn);
    this.locks.set(key, next);
    try {
      return await next;
    } finally {
      if (this.locks.get(key) === next) this.locks.delete(key);
    }
  }
  create(tenant: string, id: string, input: SandboxConfig): Workspace {
    const config = configSchema.parse(input);
    durationMs(config.idleTimeout);
    durationMs(config.retention);
    const previous = this.store.get<Workspace>(tenant, "workspace", id);
    if (previous) {
      if (fingerprint(previous.config) !== fingerprint(config))
        throw new SandboxError(
          "VALIDATION",
          "Workspace ID reused with different configuration.",
        );
      return previous;
    }
    const workspace: Workspace = {
      id,
      config,
      state: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + durationMs(config.retention),
    };
    this.store.put(tenant, "workspace", id, workspace);
    return workspace;
  }
  workspace(tenant: string, id: string): Workspace {
    const ws = this.store.get<Workspace>(tenant, "workspace", id);
    if (!ws) throw new SandboxError("NOT_FOUND", "Workspace not found.");
    if (
      ws.expiresAt <= Date.now() ||
      ws.state === "expired" ||
      ws.state === "destroyed"
    )
      throw new SandboxError(
        "EXPIRED",
        "Workspace has expired or was destroyed.",
      );
    return ws;
  }
  async ready(
    tenant: string,
    id: string,
  ): Promise<Workspace & { providerId: string }> {
    return this.exclusive(`${tenant}:workspace:${id}`, async () => {
      const ws = this.workspace(tenant, id);
      if (!ws.providerId) {
        // Deterministic provider name reconciles uncertain creation responses.
        ws.providerId = await this.provider.ensure(
          `cvx-${fingerprint([tenant, id]).slice(0, 32)}`,
          ws.config,
        );
      }
      await this.provider.resume(ws.providerId);
      ws.state = "ready";
      this.store.put(tenant, "workspace", id, ws);
      return ws as Workspace & { providerId: string };
    });
  }
  submit(
    tenant: string,
    id: string,
    workspaceId: string,
    input: Job,
  ): ServiceRun {
    const job = jobSchema.parse(input);
    durationMs(job.timeout);
    durationMs(job.artifactRetention);
    const hash = fingerprint({ workspaceId, job });
    const previous = this.store.get<ServiceRun>(tenant, "run", id);
    if (previous) {
      if (previous.fingerprint !== hash)
        throw new SandboxError(
          "VALIDATION",
          "Submission ID reused with different work.",
        );
      return previous;
    }
    const ws = this.workspace(tenant, workspaceId);
    if (Date.now() + durationMs(job.timeout) > ws.expiresAt)
      throw new SandboxError(
        "VALIDATION",
        "Run timeout exceeds remaining workspace retention.",
      );
    const run: ServiceRun = {
      id,
      workspaceId,
      job,
      fingerprint: hash,
      status: "queued",
      createdAt: Date.now(),
      stdout: { text: "", truncated: false },
      stderr: { text: "", truncated: false },
      durationMs: 0,
      exitCode: null,
    };
    this.store.put(tenant, "run", id, run);
    return run;
  }
  get(tenant: string, id: string): ServiceRun {
    const run = this.store.get<ServiceRun>(tenant, "run", id);
    if (!run) throw new SandboxError("NOT_FOUND", "Run not found.");
    return run;
  }
  cancel(tenant: string, id: string) {
    const run = this.get(tenant, id);
    if (!terminal(run.status)) {
      run.cancelRequested = true;
      this.store.put(tenant, "run", id, run);
    }
    return run;
  }
  async tick(tenant: string, id: string): Promise<void> {
    return this.exclusive(`${tenant}:run:${id}`, async () => {
      let run = this.get(tenant, id);
      if (terminal(run.status)) return;
      try {
        if (run.cancelRequested && !run.startedAt) {
          run.status = "cancelled";
          run.completedAt = Date.now();
          this.store.put(tenant, "run", id, run);
          return;
        }
        const ws = await this.ready(tenant, run.workspaceId);
        run = this.get(tenant, id);
        if (!run.startedAt) {
          await this.provider.stage(ws.providerId, id, run.job);
          run = this.get(tenant, id);
          run.startedAt = Date.now();
          run.status = "running";
          this.store.put(tenant, "run", id, run);
        }
        // Cancellation marker precedes submission, including recovery races.
        if (run.cancelRequested) await this.provider.cancel(ws.providerId, id);
        if (!run.submitted) {
          await this.provider.submit(ws.providerId, id);
          run = this.get(tenant, id);
          run.submitted = true;
          this.store.put(tenant, "run", id, run);
        }
        const observation = await this.provider.observe(ws.providerId, id);
        run = this.get(tenant, id);
        if (observation) {
          delete run.error;
          Object.assign(run, observation);
          if (terminal(run.status)) run.completedAt = Date.now();
        }
        this.store.put(tenant, "run", id, run);
        if (terminal(run.status) && !this.hasActive(tenant, run.workspaceId))
          await this.provider.idle?.(
            ws.providerId,
            Math.ceil(durationMs(ws.config.idleTimeout ?? "10m") / 60_000),
          );
      } catch (error) {
        run = this.get(tenant, id);
        // Transport uncertainty is recoverable. Do not falsely report termination.
        run.error = error instanceof Error ? error.message : String(error);
        if (
          error instanceof SandboxError &&
          ["EXPIRED", "VALIDATION"].includes(error.code)
        ) {
          run.status = "failed";
          run.completedAt = Date.now();
        }
        this.store.put(tenant, "run", id, run);
      }
    });
  }
  hasActive(tenant: string, workspaceId: string): boolean {
    return this.store.hasActiveRun(tenant, workspaceId);
  }

  async lifecycle(
    tenant: string,
    id: string,
    operation: "suspend" | "destroy",
  ) {
    return this.exclusive(`${tenant}:workspace:${id}`, async () => {
      const ws = this.store.get<Workspace>(tenant, "workspace", id);
      if (!ws) throw new SandboxError("NOT_FOUND", "Workspace not found.");
      if (ws.state === "destroyed" || ws.state === "expired") return;
      if (this.hasActive(tenant, id))
        throw new SandboxError("BUSY", "Finish or cancel active runs first.");
      if (ws.providerId) await this.provider[operation](ws.providerId);
      else if (operation === "destroy")
        await this.provider.destroy(
          `cvx-${fingerprint([tenant, id]).slice(0, 32)}`,
        );
      ws.state = operation === "destroy" ? "destroyed" : "suspended";
      this.store.put(tenant, "workspace", id, ws);
    });
  }
  async sweep() {
    let cursor = "";
    do {
      const page = this.store.list<ServiceRun>("run", cursor, 100, true);
      // Sequential bounded requests avoid an unbounded provider burst after restart.
      for (const row of page)
        if (!terminal(row.data.status)) await this.tick(row.tenant, row.id);
      if (page.length < 100) break;
      cursor = page.at(-1)!.cursor;
    } while (true);
    cursor = "";
    do {
      const page = this.store.list<Workspace>("workspace", cursor);
      for (const row of page)
        if (
          row.data.expiresAt <= Date.now() &&
          !["destroyed", "expired"].includes(row.data.state)
        ) {
          if (this.hasActive(row.tenant, row.id)) continue;
          await this.lifecycle(row.tenant, row.id, "destroy");
          const ws = this.store.get<Workspace>(
            row.tenant,
            "workspace",
            row.id,
          )!;
          ws.state = "expired";
          this.store.put(row.tenant, "workspace", row.id, ws);
        }
      if (page.length < 100) break;
      cursor = page.at(-1)!.cursor;
    } while (true);
  }
}
