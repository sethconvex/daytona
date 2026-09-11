import { createFunctionHandle } from "convex/server";
import type { Task } from "./task.js";
import { sandboxTool, sandboxCodingTools } from "./agent.js";
import type {
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import {
  configSchema,
  jobSchema,
  SandboxError,
  MAX_FILE_BYTES,
  type SandboxConfig,
  type SandboxId,
  type SandboxRunId,
  type SandboxArtifactId,
  type Job,
  type RunResult,
} from "./types.js";
type QueryCtx = Pick<GenericActionCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<GenericActionCtx<GenericDataModel>, "runMutation">;
type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
>;
type Ref = FunctionReference<any, any, any, any>;
export type SandboxComponent = { sandboxes: Record<string, Ref> };
export type SandboxOptions = {
  defaults?: Partial<SandboxConfig>;
  service?: { url: string; token: string };
};
export type SandboxJob = Job & Partial<SandboxConfig> & { requestId?: string };
export type SandboxTask = Task;
export class Sandbox {
  constructor(
    readonly component: SandboxComponent,
    readonly options: SandboxOptions = {},
  ) {}
  service() {
    const service = this.options.service ?? {
      url: process.env.SANDBOX_SERVICE_URL ?? "",
      token: process.env.SANDBOX_SERVICE_TOKEN ?? "",
    };
    if (!service.url || !service.token)
      throw new SandboxError(
        "VALIDATION",
        "Set SANDBOX_SERVICE_URL and SANDBOX_SERVICE_TOKEN.",
      );
    return service;
  }
  config(input: Partial<SandboxConfig> = {}) {
    return configSchema.parse({ ...this.options.defaults, ...input });
  }
  async create(ctx: MutationCtx, config: Partial<SandboxConfig> = {}) {
    const id = await ctx.runMutation(this.component.sandboxes.create!, {
      config: JSON.stringify(this.config(config)),
    });
    return this.fromId(id as SandboxId);
  }
  fromId(id: string) {
    return new SandboxInstance(this, id as SandboxId);
  }
  async start(
    ctx: MutationCtx,
    input: SandboxJob,
    sandboxId?: SandboxId,
    agentToken?: string,
  ): Promise<SandboxRunId> {
    const {
      template,
      resources,
      idleTimeout,
      retention,
      secrets,
      requestId,
      ...jobInput
    } = input;
    const configOverrides = Object.fromEntries(
      Object.entries({
        template,
        resources,
        idleTimeout,
        retention,
        secrets,
      }).filter(([, value]) => value !== undefined),
    );
    if (sandboxId && Object.keys(configOverrides).length)
      throw new SandboxError(
        "VALIDATION",
        "Configure resources and templates at workspace creation.",
      );
    const job = jobSchema.parse(jobInput);
    return ctx.runMutation(this.component.sandboxes.start!, {
      ...(sandboxId
        ? { sandboxId }
        : { config: JSON.stringify(this.config(configOverrides)) }),
      job: JSON.stringify(job),
      requestId: requestId ?? crypto.randomUUID(),
      service: this.service(),
      ...(agentToken ? { agentToken } : {}),
    });
  }
  async run(
    ctx: ActionCtx,
    input: SandboxJob,
    sandboxId?: SandboxId,
  ): Promise<RunResult> {
    const runId = await this.start(ctx, input, sandboxId);
    return this.wait(ctx, runId);
  }
  async wait(ctx: QueryCtx, runId: SandboxRunId): Promise<RunResult> {
    while (true) {
      const run = await this.runs.get(ctx, runId);
      if (!run) throw new SandboxError("NOT_FOUND", "Run not found.", runId);
      if (run.finalized) {
        if (run.status === "failed")
          throw new SandboxError(
            "FAILED",
            run.result?.error ?? run.error ?? "Sandbox run failed.",
            runId,
          );
        return { runId, ...run.result, artifacts: run.artifacts } as RunResult;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  readonly templates = {
    start: (
      ctx: ActionCtx,
      spec: import("../service/templates.js").TemplateSpec,
    ) =>
      ctx.runAction(this.component.sandboxes.templateOperation!, {
        operation: "build",
        spec: JSON.stringify(spec),
        service: this.service(),
      }),
    get: (ctx: ActionCtx, id: string) =>
      ctx.runAction(this.component.sandboxes.templateOperation!, {
        operation: "get",
        id,
        service: this.service(),
      }),
    build: async (
      ctx: ActionCtx,
      spec: import("../service/templates.js").TemplateSpec,
    ) => {
      let template = await this.templates.start(ctx, spec);
      while (template.status !== "ready") {
        if (template.status === "failed")
          throw new SandboxError(
            "FAILED",
            template.error ?? "Template build failed.",
          );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        template = await this.templates.get(ctx, template.id);
      }
      return template;
    },
  };
  readonly runs = {
    get: (ctx: QueryCtx, runId: string) =>
      ctx.runQuery(this.component.sandboxes.getRun!, { runId }),
    cancel: (ctx: MutationCtx, runId: string) =>
      ctx.runMutation(this.component.sandboxes.cancel!, { runId }),
  };
  readonly artifacts = {
    get: (ctx: QueryCtx, id: SandboxArtifactId) =>
      ctx.runQuery(this.component.sandboxes.getArtifact!, { id }),
    getUrl: (ctx: QueryCtx, id: SandboxArtifactId) =>
      ctx.runQuery(this.component.sandboxes.artifactUrl!, { id }),
    readText: (
      ctx: ActionCtx,
      id: SandboxArtifactId,
      maxBytes = 512 * 1024,
    ): Promise<string> =>
      ctx.runAction(this.component.sandboxes.artifactText!, { id, maxBytes }),
  };
  tool(options: { agentComponent?: string } = {}) {
    return sandboxTool(this, options);
  }
  codingTools(options: { agentComponent?: string } = {}) {
    return sandboxCodingTools(this, options);
  }
  async task(input: SandboxJob, sandboxId?: SandboxId): Promise<SandboxTask> {
    const {
      template,
      resources,
      idleTimeout,
      retention,
      secrets,
      requestId: _requestId,
      ...job
    } = input;
    const overrides = Object.fromEntries(
      Object.entries({
        template,
        resources,
        idleTimeout,
        retention,
        secrets,
      }).filter(([, value]) => value !== undefined),
    );
    return {
      name: "Sandbox command",
      start: (await createFunctionHandle(
        this.component.sandboxes.taskStart!,
      )) as Task["start"],
      config: {
        ...(sandboxId
          ? { sandboxId }
          : { config: JSON.stringify(this.config(overrides)) }),
        job: JSON.stringify(jobSchema.parse(job)),
        service: this.service(),
      },
    };
  }
  async getForThread(
    ctx: QueryCtx,
    threadId: string,
    agentComponent = "agent",
  ) {
    const ws = await ctx.runQuery(this.component.sandboxes.getForThread!, {
      threadKey: JSON.stringify([agentComponent, threadId]),
    });
    return ws ? this.fromId(ws._id) : null;
  }
  async forThread(ctx: ActionCtx, threadId: string, agentComponent = "agent") {
    const previous = await this.getForThread(ctx, threadId, agentComponent);
    const id = await ctx.runMutation(this.component.sandboxes.create!, {
      config: JSON.stringify(this.config()),
      threadKey: JSON.stringify([agentComponent, threadId]),
    });
    return {
      instance: this.fromId(id),
      reset: previous !== null && previous.id !== id,
    };
  }
}
export class SandboxInstance {
  constructor(
    readonly sandbox: Sandbox,
    readonly id: SandboxId,
  ) {}
  start(ctx: MutationCtx, job: Job & { requestId?: string }) {
    return this.sandbox.start(ctx, job, this.id);
  }
  run(ctx: ActionCtx, job: Job & { requestId?: string }) {
    return this.sandbox.run(ctx, job, this.id);
  }
  tool() {
    return sandboxTool(this.sandbox, { instance: this });
  }
  codingTools() {
    return sandboxCodingTools(this.sandbox, { instance: this });
  }
  task(job: Job): Promise<SandboxTask> {
    return this.sandbox.task(job, this.id);
  }
  private operate(
    ctx: ActionCtx,
    operation: "read" | "write" | "suspend" | "destroy",
    body = {},
  ) {
    return ctx.runAction(this.sandbox.component.sandboxes.operate!, {
      id: this.id,
      operation,
      body: JSON.stringify(body),
      service: this.sandbox.service(),
    });
  }
  suspend(ctx: ActionCtx) {
    return this.operate(ctx, "suspend");
  }
  destroy(ctx: ActionCtx) {
    return this.operate(ctx, "destroy");
  }
  readonly files = {
    write: (
      ctx: ActionCtx,
      file: { path: string; contents: string; encoding?: "utf8" | "base64" },
    ) => this.operate(ctx, "write", file),
    read: async (ctx: ActionCtx, file: { path: string; maxBytes?: number }) => {
      const result = await this.operate(ctx, "read", {
        ...file,
        maxBytes: file.maxBytes ?? Math.min(MAX_FILE_BYTES, 512 * 1024),
      });
      return {
        contents: new TextDecoder().decode(
          Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0)),
        ),
        encoding: "utf8" as const,
      };
    },
    download: (ctx: ActionCtx, file: { path: string; maxBytes?: number }) =>
      this.operate(ctx, "read", {
        ...file,
        maxBytes: file.maxBytes ?? 512 * 1024,
      }),
    upload: (
      ctx: ActionCtx,
      file: { path: string; contents: string; encoding: "base64" },
    ) => this.operate(ctx, "write", file),
    search: (ctx: ActionCtx, args: { pattern: string; path?: string }) =>
      this.run(ctx, {
        command: [
          "grep",
          "-R",
          "-n",
          "--",
          args.pattern,
          args.path ?? "/workspace",
        ],
        timeout: "30s",
      }),
  };
}
