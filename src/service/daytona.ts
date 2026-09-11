import { z } from "zod";
import { Daytona, DaytonaNotFoundError, Image, GpuType } from "@daytona/sdk";
import { dirname } from "node:path";
import {
  PREVIEW_BYTES,
  MAX_FILE_BYTES,
  SandboxError,
  durationMs,
  resourcePresets,
  sizeGiB,
  type SandboxConfig,
  type Job,
} from "../sandbox/types.js";
import { quote, runDirectory, supervisor } from "./supervisor.js";
import type { Observation, Provider } from "./engine.js";

export class DaytonaProvider implements Provider {
  constructor(
    readonly daytona: Daytona,
    readonly images: Record<string, string | Image> = {
      python: Image.debianSlim("3.13").runCommands("mkdir -p /workspace"),
      node: Image.base("node:22-bookworm-slim").runCommands(
        "apt-get update && apt-get install -y python3 && mkdir -p /workspace",
      ),
      coding: Image.base("node:22-bookworm-slim").runCommands(
        "apt-get update && apt-get install -y python3 python3-pip python3-venv git curl ripgrep && mkdir -p /workspace",
      ),
    },
  ) {}
  async ensure(name: string, config: SandboxConfig) {
    try {
      return (await this.daytona.get(name)).id;
    } catch (error) {
      if (!(error instanceof DaytonaNotFoundError)) throw error;
    }
    for (const name of Object.values(config.secrets ?? {})) {
      const secret = await this.daytona.secret.get(name);
      if (!secret.hosts?.length)
        throw new SandboxError(
          "VALIDATION",
          "Mounted credentials require an explicit host allowlist.",
        );
    }
    const image = this.images[config.template ?? "coding"];
    if (!image)
      throw new SandboxError(
        "VALIDATION",
        "Unknown template. Build or register it before creating a workspace.",
      );
    const resources =
      typeof config.resources === "string"
        ? resourcePresets[config.resources]
        : config.resources;
    const gpuModel = "gpuModel" in resources ? resources.gpuModel : undefined;
    const gpuType =
      gpuModel === undefined
        ? undefined
        : Object.values(GpuType).find((value) => value === gpuModel);
    if (gpuModel !== undefined && !gpuType)
      throw new SandboxError(
        "VALIDATION",
        `Unsupported Daytona GPU model: ${gpuModel}`,
      );
    const memory = sizeGiB(resources.memory),
      disk = sizeGiB(resources.disk);
    if (
      !Number.isInteger(memory) ||
      !Number.isInteger(disk) ||
      memory > 128 ||
      disk > 1024
    )
      throw new SandboxError(
        "VALIDATION",
        "Daytona resources require whole GiB (memory ≤128, disk ≤1024).",
      );
    const sandbox = await this.daytona.create(
      {
        name,
        image,
        language: "python",
        public: false,
        resources: {
          cpu: resources.cpu,
          memory,
          disk,
          gpu: "gpu" in resources ? resources.gpu : undefined,
          gpuType,
        },
        secrets: config.secrets,
        autoStopInterval: Math.ceil(
          durationMs(config.idleTimeout ?? "10m") / 60_000,
        ),
        autoDeleteInterval: -1,
      },
      { timeout: 60 },
    );
    return sandbox.id;
  }
  async resume(id: string) {
    try {
      const sandbox = await this.daytona.get(id);
      if (sandbox.state !== "started") await sandbox.start(60);
    } catch (error) {
      if (error instanceof DaytonaNotFoundError)
        throw new SandboxError(
          "EXPIRED",
          "Daytona workspace no longer exists.",
        );
      throw error;
    }
  }
  async idle(id: string, minutes: number) {
    await (await this.daytona.get(id)).setAutostopInterval(minutes);
  }
  async suspend(id: string) {
    await (await this.daytona.get(id)).stop(60);
  }
  async destroy(id: string) {
    try {
      await (await this.daytona.get(id)).delete(60, true);
    } catch (error) {
      if (!(error instanceof DaytonaNotFoundError)) throw error;
    }
  }
  async stage(id: string, runId: string, job: Job) {
    const sandbox = await this.daytona.get(id);
    const root = runDirectory(runId);
    await sandbox.setAutostopInterval(0);
    const check = await sandbox.process.executeCommand(
      `test -e ${quote(root + "/started")}`,
      undefined,
      undefined,
      10,
    );
    if (check.exitCode === 0) return;
    for (const file of job.files ?? [])
      await this.write(
        id,
        file.path,
        Buffer.from(
          file.contents,
          file.encoding === "base64" ? "base64" : "utf8",
        ),
      );
    await this.write(
      id,
      root + "/supervisor.py",
      Buffer.from(supervisor(runId, job)),
    );
  }
  async submit(id: string, runId: string) {
    const sandbox = await this.daytona.get(id);
    const sessionId = `cvx-${runId}`;
    try {
      const session = await sandbox.process.getSession(sessionId);
      if (session.commands?.length) return;
    } catch (error) {
      if (!(error instanceof DaytonaNotFoundError)) throw error;
      await sandbox.process.createSession(sessionId);
    }
    // A duplicate launcher is safe: the supervisor holds a lock and durable marker.
    await sandbox.process.executeSessionCommand(
      sessionId,
      {
        command: `python3 ${quote(runDirectory(runId) + "/supervisor.py")}`,
        runAsync: true,
      },
      10,
    );
  }
  async observe(id: string, runId: string): Promise<Observation | null> {
    const sandbox = await this.daytona.get(id);
    const root = runDirectory(runId);
    const script = `import json,os,base64\nr=${JSON.stringify(root)}\np=r+'/result.json'\nv=json.load(open(p)) if os.path.exists(p) else {'status':'running','exitCode':None,'durationMs':0}\nfor s in ['stdout','stderr']:\n f=r+'/'+s\n b=open(f,'rb').read(${PREVIEW_BYTES + 1}) if os.path.exists(f) else b''\n v[s]={'text':b[:${PREVIEW_BYTES}].decode('utf-8','replace'),'truncated':len(b)>${PREVIEW_BYTES},'outputPath':f}\nprint(json.dumps(v))`;
    const result = await sandbox.process.executeCommand(
      `python3 -c ${quote(script)}`,
      undefined,
      undefined,
      15,
    );
    if (result.exitCode !== 0) throw new Error("Could not inspect remote run.");
    const observation = z
      .object({
        status: z.enum([
          "queued",
          "running",
          "exited",
          "timedOut",
          "cancelled",
          "failed",
        ]),
        exitCode: z.number().int().nullable(),
        durationMs: z.number().nonnegative(),
        error: z.string().max(2000).optional(),
        stdout: z.object({
          text: z.string().max(PREVIEW_BYTES * 2),
          truncated: z.boolean(),
          outputPath: z.string(),
        }),
        stderr: z.object({
          text: z.string().max(PREVIEW_BYTES * 2),
          truncated: z.boolean(),
          outputPath: z.string(),
        }),
      })
      .parse(JSON.parse(result.result));
    if (observation.status === "running") {
      const session = await sandbox.process.getSession(`cvx-${runId}`);
      if (
        session.commands.length &&
        session.commands.every((command) => command.exitCode !== undefined)
      ) {
        observation.status = "failed";
        observation.error =
          "Remote supervisor exited without a result; command was not retried.";
      }
    }
    return observation;
  }
  async cancel(id: string, runId: string) {
    await this.write(
      id,
      runDirectory(runId) + "/cancel",
      Buffer.from("cancel"),
    );
  }
  async read(id: string, path: string, maxBytes: number): Promise<Uint8Array> {
    if (
      !Number.isInteger(maxBytes) ||
      maxBytes < 1 ||
      maxBytes > 32 * 1024 * 1024
    )
      throw new SandboxError("VALIDATION", "Invalid download limit.");
    const sandbox = await this.daytona.get(id);
    // Read through a bounded helper, avoiding a stat/download race on changing files.
    const target = `/tmp/convex-download-${crypto.randomUUID()}`;
    const script = `import os,stat\np=${JSON.stringify(path)}\nf=open(p,'rb')\nif not stat.S_ISREG(os.fstat(f.fileno()).st_mode): raise Exception('Expected regular file')\nb=f.read(${maxBytes + 1})\nif len(b)>${maxBytes}: raise Exception('File exceeds download limit')\nopen(${JSON.stringify(target)},'wb').write(b)`;
    const result = await sandbox.process.executeCommand(
      `python3 -c ${quote(script)}`,
      undefined,
      undefined,
      15,
    );
    if (result.exitCode !== 0)
      throw new SandboxError(
        "FAILED",
        "File missing, unreadable, or exceeds the download limit.",
      );
    try {
      return await sandbox.fs.downloadFile(target, 30);
    } finally {
      await sandbox.fs.deleteFile(target).catch(() => {});
    }
  }
  async write(id: string, path: string, contents: Uint8Array) {
    if (contents.length > MAX_FILE_BYTES)
      throw new SandboxError("VALIDATION", "File exceeds 512 KiB.");
    if (!path.startsWith("/") || path.includes("\0"))
      throw new SandboxError("VALIDATION", "Use an absolute path.");
    const sandbox = await this.daytona.get(id);
    const result = await sandbox.process.executeCommand(
      `mkdir -p -- ${quote(dirname(path))}`,
      undefined,
      undefined,
      10,
    );
    if (result.exitCode !== 0)
      throw new Error("Could not create file directory.");
    await sandbox.fs.uploadFile(Buffer.from(contents), path, 30);
  }
}
