"use node";

import {
  Daytona,
  type CreateSandboxFromImageParams,
  type CreateSandboxFromSnapshotParams,
  type DaytonaConfig,
} from "@daytona/sdk";
import { anyApi } from "convex/server";
import { v, type Infer } from "convex/values";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";

const internalApi = (anyApi as any).lib;

const recordOfStrings = v.record(v.string(), v.string());

const authValidator = v.object({
  apiKey: v.optional(v.string()),
  apiUrl: v.optional(v.string()),
  jwtToken: v.optional(v.string()),
  organizationId: v.optional(v.string()),
  target: v.optional(v.string()),
});

const resourcesValidator = v.object({
  cpu: v.optional(v.number()),
  gpu: v.optional(v.number()),
  memory: v.optional(v.number()),
  disk: v.optional(v.number()),
});

const volumeMountValidator = v.object({
  volumeId: v.string(),
  mountPath: v.string(),
});

const stagedFileValidator = v.object({
  content: v.string(),
  encoding: v.optional(v.union(v.literal("utf8"), v.literal("base64"))),
  mode: v.optional(v.string()),
  path: v.string(),
});

const packageInstallValidator = v.object({
  command: v.optional(v.string()),
  manager: v.optional(
    v.union(v.literal("npm"), v.literal("pnpm"), v.literal("yarn")),
  ),
  packages: v.optional(v.array(v.string())),
});

const createSandboxValidator = v.object({
  autoArchiveInterval: v.optional(v.number()),
  autoDeleteInterval: v.optional(v.number()),
  autoStopInterval: v.optional(v.number()),
  envVars: v.optional(recordOfStrings),
  ephemeral: v.optional(v.boolean()),
  image: v.optional(v.string()),
  labels: v.optional(recordOfStrings),
  language: v.optional(
    v.union(
      v.literal("python"),
      v.literal("typescript"),
      v.literal("javascript"),
    ),
  ),
  name: v.optional(v.string()),
  networkAllowList: v.optional(v.string()),
  networkBlockAll: v.optional(v.boolean()),
  public: v.optional(v.boolean()),
  resources: v.optional(resourcesValidator),
  snapshot: v.optional(v.string()),
  user: v.optional(v.string()),
  volumes: v.optional(v.array(volumeMountValidator)),
});

const commandSandboxValidator = v.object({
  create: v.optional(createSandboxValidator),
  deleteAfter: v.optional(v.boolean()),
  files: v.optional(v.array(stagedFileValidator)),
  id: v.optional(v.string()),
  seedDownloadUrl: v.optional(v.string()),
});

const outputValidator = v.object({
  lineBuffered: v.optional(v.boolean()),
  onOutput: v.optional(v.string()),
});

const sandboxSummaryValidator = v.object({
  autoArchiveInterval: v.optional(v.number()),
  autoDeleteInterval: v.optional(v.number()),
  autoStopInterval: v.optional(v.number()),
  createdAt: v.optional(v.string()),
  disk: v.optional(v.number()),
  id: v.string(),
  labels: v.optional(recordOfStrings),
  memory: v.optional(v.number()),
  name: v.optional(v.string()),
  snapshot: v.optional(v.string()),
  state: v.optional(v.string()),
  target: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
});

const executeResultValidator = v.object({
  artifacts: v.optional(
    v.object({
      charts: v.optional(v.array(v.any())),
      stdout: v.string(),
    }),
  ),
  exitCode: v.number(),
  result: v.string(),
  stderr: v.optional(v.string()),
});

const streamValidator = v.object({
  lineBuffered: v.optional(v.boolean()),
  onChunk: v.optional(v.string()),
});

const captureValidator = v.object({
  onArtifact: v.optional(v.string()),
  path: v.string(),
  uploadUrl: v.optional(v.string()),
});

const callbackValidator = v.object({
  envName: v.optional(v.string()),
  secret: v.optional(v.union(v.literal("mint"), v.string())),
});

const artifactValidator = v.object({
  contentType: v.string(),
  path: v.string(),
  size: v.number(),
  storageId: v.optional(v.string()),
  uploadUrl: v.optional(v.string()),
});

const runResultValidator = v.object({
  artifact: v.optional(artifactValidator),
  callbackSecret: v.optional(v.string()),
  createdSandbox: v.boolean(),
  deletedSandbox: v.boolean(),
  durationMs: v.number(),
  result: executeResultValidator,
  sandbox: sandboxSummaryValidator,
});

type DaytonaAuth = Infer<typeof authValidator>;
type CreateSandboxArgs = Infer<typeof createSandboxValidator>;
type StagedFile = Infer<typeof stagedFileValidator>;
type PackageInstall = Infer<typeof packageInstallValidator>;
type CaptureArgs = Infer<typeof captureValidator>;
type OutputArgs = Infer<typeof outputValidator>;
type StreamArgs = Infer<typeof streamValidator>;
type CallbackArgs = Infer<typeof callbackValidator>;
type CommandSandboxArgs = Infer<typeof commandSandboxValidator>;

type SandboxLike = {
  autoArchiveInterval?: number;
  autoDeleteInterval?: number;
  autoStopInterval?: number;
  createdAt?: string;
  disk?: number;
  id: string;
  labels?: Record<string, string>;
  memory?: number;
  name?: string;
  snapshot?: string;
  state?: string;
  target?: string;
  updatedAt?: string;
};

type SandboxRuntime = SandboxLike & {
  fs: {
    setFilePermissions: (
      path: string,
      permissions: { mode?: string },
    ) => Promise<void>;
    uploadFiles: (
      files: Array<{ source: Buffer; destination: string }>,
      timeout?: number,
    ) => Promise<void>;
    downloadFile: (remotePath: string, timeout?: number) => Promise<Buffer>;
  };
  process: {
    createSession: (sessionId: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    executeCommand: (
      command: string,
      cwd?: string,
      env?: Record<string, string>,
      timeout?: number,
    ) => Promise<{
      artifacts?: { charts?: unknown[]; stdout: string };
      exitCode: number;
      result: string;
    }>;
    executeSessionCommand: (
      sessionId: string,
      request: {
        command: string;
        runAsync?: boolean;
        suppressInputEcho?: boolean;
      },
      timeout?: number,
    ) => Promise<{ cmdId?: string; exitCode?: number; stdout?: string; stderr?: string }>;
    getSessionCommand: (
      sessionId: string,
      commandId: string,
    ) => Promise<{ exitCode?: number }>;
    getSessionCommandLogs: (
      sessionId: string,
      commandId: string,
      onStdout: (chunk: string) => void,
      onStderr: (chunk: string) => void,
    ) => Promise<void>;
  };
};

type CommandSpec = {
  callback?: CallbackArgs;
  capture?: CaptureArgs;
  command: string;
  create?: CreateSandboxArgs;
  cwd?: string;
  deleteAfter?: boolean;
  env?: Record<string, string>;
  files?: StagedFile[];
  install?: PackageInstall;
  output?: OutputArgs;
  sandboxId?: string;
  seedDownloadUrl?: string;
  stream?: StreamArgs;
  timeout?: number;
};

export const createSandbox = action({
  args: {
    auth: authValidator,
    create: v.optional(createSandboxValidator),
    createTimeout: v.optional(v.number()),
    files: v.optional(v.array(stagedFileValidator)),
    install: v.optional(packageInstallValidator),
    seedDownloadUrl: v.optional(v.string()),
  },
  returns: sandboxSummaryValidator,
  handler: async (_ctx, args) => {
    const daytona = makeDaytona(args.auth);
    const sandbox = await createNewSandbox(
      daytona,
      args.create,
      args.createTimeout,
    );
    await stageSandbox(sandbox, {
      files: args.files,
      install: args.install,
      seedDownloadUrl: args.seedDownloadUrl,
    });
    return summarizeSandbox(sandbox);
  },
});

export const deleteSandbox = action({
  args: {
    auth: authValidator,
    sandboxId: v.string(),
    timeout: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const daytona = makeDaytona(args.auth);
    const sandbox = await daytona.get(args.sandboxId);
    await daytona.delete(sandbox, args.timeout);
    return null;
  },
});

export const getSandbox = action({
  args: {
    auth: authValidator,
    sandboxId: v.string(),
  },
  returns: sandboxSummaryValidator,
  handler: async (_ctx, args) => {
    const daytona = makeDaytona(args.auth);
    const sandbox = await daytona.get(args.sandboxId);
    return summarizeSandbox(sandbox);
  },
});

export const runCommand = action({
  args: {
    auth: authValidator,
    callback: v.optional(callbackValidator),
    capture: v.optional(captureValidator),
    command: v.string(),
    create: v.optional(createSandboxValidator),
    createTimeout: v.optional(v.number()),
    cwd: v.optional(v.string()),
    deleteSandboxAfter: v.optional(v.boolean()),
    deleteTimeout: v.optional(v.number()),
    env: v.optional(recordOfStrings),
    files: v.optional(v.array(stagedFileValidator)),
    install: v.optional(packageInstallValidator),
    output: v.optional(outputValidator),
    sandbox: v.optional(commandSandboxValidator),
    sandboxId: v.optional(v.string()),
    seedDownloadUrl: v.optional(v.string()),
    stream: v.optional(streamValidator),
    timeout: v.optional(v.number()),
  },
  returns: runResultValidator,
  handler: async (ctx, args) => {
    const spec = normalizeCommandSpec(args);
    const daytona = makeDaytona(args.auth);
    const { sandbox, createdSandbox } = await resolveSandbox(daytona, {
      create: spec.create,
      createTimeout: args.createTimeout,
      sandboxId: spec.sandboxId,
    });
    const shouldDeleteSandbox = spec.deleteAfter ?? createdSandbox;
    const callbackSecret = resolveCallbackSecret(spec.callback);
    const env = addCallbackSecret(spec.env, spec.callback, callbackSecret);
    const start = Date.now();
    let result;
    let artifact;
    let deletedSandbox = false;
    try {
      await stageSandbox(sandbox, {
        cwd: spec.cwd,
        files: spec.files,
        install: spec.install,
        seedDownloadUrl: spec.seedDownloadUrl,
      });
      result = spec.output?.onOutput || spec.stream?.onChunk
        ? await executeStreamingCommand(ctx, sandbox, {
            command: spec.command,
            cwd: spec.cwd,
            env,
            output: normalizeOutput(spec.output, spec.stream),
            timeout: spec.timeout,
          })
        : await sandbox.process.executeCommand(
            spec.command,
            spec.cwd,
            env,
            spec.timeout,
          );
      artifact =
        spec.capture === undefined
          ? undefined
          : await captureArtifact(ctx, sandbox, spec.capture);
    } finally {
      if (shouldDeleteSandbox) {
        await daytona.delete(sandbox, args.deleteTimeout);
        deletedSandbox = true;
      }
    }
    return stripUndefined({
      artifact,
      callbackSecret,
      createdSandbox,
      deletedSandbox,
      durationMs: Date.now() - start,
      result: normalizeExecuteResult(result),
      sandbox: summarizeSandbox(sandbox),
    });
  },
});

export const startCommand = action({
  args: {
    auth: authValidator,
    callback: v.optional(callbackValidator),
    capture: v.optional(captureValidator),
    command: v.string(),
    create: v.optional(createSandboxValidator),
    createTimeout: v.optional(v.number()),
    cwd: v.optional(v.string()),
    deleteSandboxAfter: v.optional(v.boolean()),
    deleteTimeout: v.optional(v.number()),
    env: v.optional(recordOfStrings),
    files: v.optional(v.array(stagedFileValidator)),
    install: v.optional(packageInstallValidator),
    output: v.optional(outputValidator),
    sandbox: v.optional(commandSandboxValidator),
    sandboxId: v.optional(v.string()),
    seedDownloadUrl: v.optional(v.string()),
    stream: v.optional(streamValidator),
    timeout: v.optional(v.number()),
  },
  returns: v.object({ jobId: v.id("jobs") }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const jobId = await ctx.runMutation(internalApi.createJob, { now });
    await ctx.scheduler.runAfter(0, internalApi.runJob, { args, jobId });
    return { jobId };
  },
});

export const getJob = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.union(
    v.null(),
    v.object({
      artifact: v.optional(artifactValidator),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      durationMs: v.optional(v.number()),
      error: v.optional(v.string()),
      exitCode: v.optional(v.number()),
      jobId: v.id("jobs"),
      output: v.string(),
      sandboxId: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      status: v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("canceled"),
      ),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return null;
    }
    return { ...job, jobId: job._id };
  },
});

export const cancelJob = internalMutation({
  args: { jobId: v.id("jobs"), now: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "succeeded" || job.status === "failed") {
      return null;
    }
    const now = args.now ?? Date.now();
    await ctx.db.patch(args.jobId, {
      completedAt: now,
      durationMs: job.startedAt ? now - job.startedAt : undefined,
      status: "canceled",
      updatedAt: now,
    });
    return null;
  },
});

export const createJob = internalMutation({
  args: { now: v.number() },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      createdAt: args.now,
      output: "",
      status: "queued",
      updatedAt: args.now,
    });
  },
});

export const runJob = internalAction({
  args: {
    args: v.object({
      auth: authValidator,
      callback: v.optional(callbackValidator),
      capture: v.optional(captureValidator),
      command: v.string(),
      create: v.optional(createSandboxValidator),
      createTimeout: v.optional(v.number()),
      cwd: v.optional(v.string()),
      deleteSandboxAfter: v.optional(v.boolean()),
      deleteTimeout: v.optional(v.number()),
      env: v.optional(recordOfStrings),
      files: v.optional(v.array(stagedFileValidator)),
      install: v.optional(packageInstallValidator),
      output: v.optional(outputValidator),
      sandbox: v.optional(commandSandboxValidator),
      sandboxId: v.optional(v.string()),
      seedDownloadUrl: v.optional(v.string()),
      stream: v.optional(streamValidator),
      timeout: v.optional(v.number()),
    }),
    jobId: v.id("jobs"),
  },
  returns: v.null(),
  handler: async (ctx, { args, jobId }) => {
    const queuedJob = await ctx.runQuery(internalApi.getJob, { jobId });
    if (queuedJob?.status === "canceled") {
      return null;
    }
    const spec = normalizeCommandSpec(args);
    const daytona = makeDaytona(args.auth);
    const { sandbox, createdSandbox } = await resolveSandbox(daytona, {
      create: spec.create,
      createTimeout: args.createTimeout,
      sandboxId: spec.sandboxId,
    });
    const shouldDeleteSandbox = spec.deleteAfter ?? createdSandbox;
    const callbackSecret = resolveCallbackSecret(spec.callback);
    const env = addCallbackSecret(spec.env, spec.callback, callbackSecret);
    const startedAt = Date.now();
    await ctx.runMutation(internalApi.markJobRunning, {
      jobId,
      sandboxId: sandbox.id,
      startedAt,
    });
    let deletedSandbox = false;
    try {
      await stageSandbox(sandbox, {
        cwd: spec.cwd,
        files: spec.files,
        install: spec.install,
        seedDownloadUrl: spec.seedDownloadUrl,
      });
      const output = normalizeOutput(spec.output, spec.stream);
      const result =
        output.onOutput || true
          ? await executeStreamingCommand(ctx, sandbox, {
              command: spec.command,
              cwd: spec.cwd,
              env,
              jobId,
              output,
              timeout: spec.timeout,
            })
          : await sandbox.process.executeCommand(
              spec.command,
              spec.cwd,
              env,
              spec.timeout,
            );
      const artifact =
        spec.capture === undefined
          ? undefined
          : await captureArtifact(ctx, sandbox, spec.capture);
      await ctx.runMutation(internalApi.completeJob, {
        artifact,
        exitCode: result.exitCode,
        jobId,
        now: Date.now(),
        status: result.exitCode === 0 ? "succeeded" : "failed",
      });
    } catch (error) {
      await ctx.runMutation(internalApi.failJob, {
        error: error instanceof Error ? error.message : String(error),
        jobId,
        now: Date.now(),
      });
    } finally {
      if (shouldDeleteSandbox) {
        await daytona.delete(sandbox, args.deleteTimeout);
        deletedSandbox = true;
      }
      void deletedSandbox;
    }
    return null;
  },
});

export const markJobRunning = internalMutation({
  args: {
    jobId: v.id("jobs"),
    sandboxId: v.string(),
    startedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      sandboxId: args.sandboxId,
      startedAt: args.startedAt,
      status: "running",
      updatedAt: args.startedAt,
    });
    return null;
  },
});

export const appendJobOutput = internalMutation({
  args: {
    content: v.string(),
    jobId: v.id("jobs"),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return null;
    }
    await ctx.db.patch(args.jobId, {
      output: `${job.output}${args.content}`,
      updatedAt: args.now,
    });
    return null;
  },
});

export const completeJob = internalMutation({
  args: {
    artifact: v.optional(artifactValidator),
    exitCode: v.number(),
    jobId: v.id("jobs"),
    now: v.number(),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job?.status === "canceled") {
      return null;
    }
    await ctx.db.patch(args.jobId, {
      artifact: args.artifact,
      completedAt: args.now,
      durationMs: job?.startedAt ? args.now - job.startedAt : undefined,
      exitCode: args.exitCode,
      status: args.status,
      updatedAt: args.now,
    });
    return null;
  },
});

export const failJob = internalMutation({
  args: {
    error: v.string(),
    jobId: v.id("jobs"),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (job?.status === "canceled") {
      return null;
    }
    await ctx.db.patch(args.jobId, {
      completedAt: args.now,
      durationMs: job?.startedAt ? args.now - job.startedAt : undefined,
      error: args.error,
      status: "failed",
      updatedAt: args.now,
    });
    return null;
  },
});

export const runCode = action({
  args: {
    auth: authValidator,
    argv: v.optional(v.array(v.string())),
    code: v.string(),
    create: v.optional(createSandboxValidator),
    createTimeout: v.optional(v.number()),
    deleteSandboxAfter: v.optional(v.boolean()),
    deleteTimeout: v.optional(v.number()),
    env: v.optional(recordOfStrings),
    language: v.optional(
      v.union(
        v.literal("python"),
        v.literal("typescript"),
        v.literal("javascript"),
      ),
    ),
    sandboxId: v.optional(v.string()),
    timeout: v.optional(v.number()),
  },
  returns: runResultValidator,
  handler: async (_ctx, args) => {
    const daytona = makeDaytona(args.auth);
    const create =
      args.language === undefined
        ? args.create
        : {
            ...args.create,
            language: args.create?.language ?? args.language,
          };
    const { sandbox, createdSandbox } = await resolveSandbox(daytona, {
      create,
      createTimeout: args.createTimeout,
      sandboxId: args.sandboxId,
    });
    const shouldDeleteSandbox = args.deleteSandboxAfter ?? createdSandbox;
    const start = Date.now();
    let result;
    let deletedSandbox = false;
    try {
      result = await sandbox.process.codeRun(
        args.code,
        { argv: args.argv, env: args.env },
        args.timeout,
      );
    } finally {
      if (shouldDeleteSandbox) {
        await daytona.delete(sandbox, args.deleteTimeout);
        deletedSandbox = true;
      }
    }
    return {
      createdSandbox,
      deletedSandbox,
      durationMs: Date.now() - start,
      result: normalizeExecuteResult(result),
      sandbox: summarizeSandbox(sandbox),
    };
  },
});

function normalizeCommandSpec(args: {
  callback?: CallbackArgs;
  capture?: CaptureArgs;
  command: string;
  create?: CreateSandboxArgs;
  cwd?: string;
  deleteSandboxAfter?: boolean;
  env?: Record<string, string>;
  files?: StagedFile[];
  install?: PackageInstall;
  output?: OutputArgs;
  sandbox?: CommandSandboxArgs;
  sandboxId?: string;
  seedDownloadUrl?: string;
  stream?: StreamArgs;
  timeout?: number;
}): CommandSpec {
  return {
    callback: args.callback,
    capture: args.capture,
    command: args.command,
    create: args.sandbox?.create ?? args.create,
    cwd: args.cwd,
    deleteAfter: args.sandbox?.deleteAfter ?? args.deleteSandboxAfter,
    env: args.env,
    files: args.sandbox?.files ?? args.files,
    install: args.install,
    output: args.output,
    sandboxId: args.sandbox?.id ?? args.sandboxId,
    seedDownloadUrl: args.sandbox?.seedDownloadUrl ?? args.seedDownloadUrl,
    stream: args.stream,
    timeout: args.timeout,
  };
}

async function stageSandbox(
  sandbox: SandboxRuntime,
  args: {
    cwd?: string;
    files?: StagedFile[];
    install?: PackageInstall;
    seedDownloadUrl?: string;
  },
) {
  if (args.seedDownloadUrl) {
    await seedSandbox(sandbox, args.seedDownloadUrl, args.cwd);
  }
  if (args.files?.length) {
    await uploadStagedFiles(sandbox, args.files, args.cwd);
  }
  if (args.install) {
    await installPackages(sandbox, args.install, args.cwd);
  }
}

async function seedSandbox(
  sandbox: SandboxRuntime,
  seedDownloadUrl: string,
  cwd?: string,
) {
  const destination = cwd ?? ".";
  const result = await sandbox.process.executeCommand(
    [
      `mkdir -p ${shellQuote(destination)}`,
      `curl -fsSL "$DAYTONA_SEED_DOWNLOAD_URL" | tar -xzf - -C ${shellQuote(destination)}`,
    ].join(" && "),
    undefined,
    { DAYTONA_SEED_DOWNLOAD_URL: seedDownloadUrl },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to seed Daytona sandbox: ${result.result || "unknown error"}`,
    );
  }
}

async function uploadStagedFiles(
  sandbox: SandboxRuntime,
  files: StagedFile[],
  cwd?: string,
) {
  await sandbox.fs.uploadFiles(
    files.map((file) => ({
      destination: resolveSandboxPath(file.path, cwd),
      source: Buffer.from(file.content, file.encoding ?? "utf8"),
    })),
  );
  await Promise.all(
    files
      .filter((file) => file.mode !== undefined)
      .map((file) =>
        sandbox.fs.setFilePermissions(resolveSandboxPath(file.path, cwd), {
          mode: file.mode,
        }),
      ),
  );
}

async function installPackages(
  sandbox: SandboxRuntime,
  install: PackageInstall,
  cwd?: string,
) {
  const command = install.command ?? buildPackageInstallCommand(install);
  if (!command) {
    return;
  }
  const result = await sandbox.process.executeCommand(command, cwd);
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to install packages: ${result.result || "unknown error"}`,
    );
  }
}

function buildPackageInstallCommand(install: PackageInstall) {
  if (install.command) {
    return install.command;
  }
  if (!install.packages?.length) {
    return undefined;
  }
  const packages = install.packages.map(shellQuote).join(" ");
  switch (install.manager ?? "npm") {
    case "pnpm":
      return `pnpm add ${packages}`;
    case "yarn":
      return `yarn add ${packages}`;
    case "npm":
      return `npm install ${packages}`;
  }
}

async function executeStreamingCommand(
  ctx: { runMutation: (handle: any, args: any) => Promise<unknown> },
  sandbox: SandboxRuntime,
  args: {
    command: string;
    cwd?: string;
    env?: Record<string, string>;
    jobId?: string;
    output: OutputArgs;
    timeout?: number;
  },
) {
  const runId = randomUUID();
  const sessionId = `daytona-${runId}`;
  const emitter = createStreamEmitter(ctx, {
    jobId: args.jobId,
    lineBuffered: args.output.lineBuffered ?? true,
    onOutput: args.output.onOutput,
    runId,
    sandboxId: sandbox.id,
  });
  await sandbox.process.createSession(sessionId);
  try {
    const started = await sandbox.process.executeSessionCommand(
      sessionId,
      {
        command: buildSessionCommand(args.command, args.cwd, args.env),
        runAsync: true,
        suppressInputEcho: true,
      },
      args.timeout,
    );
    const commandId = started.cmdId;
    if (!commandId) {
      throw new Error("Daytona did not return a command id for the session.");
    }
    await sandbox.process.getSessionCommandLogs(
      sessionId,
      commandId,
      (chunk) => emitter.push("stdout", chunk),
      (chunk) => emitter.push("stderr", chunk),
    );
    await emitter.flush();
    const command = await waitForSessionCommandExit(
      sandbox,
      sessionId,
      commandId,
      args.timeout,
    );
    return {
      artifacts: { stdout: emitter.stdout },
      exitCode: command.exitCode ?? started.exitCode ?? 0,
      result: emitter.stdout,
      stderr: emitter.stderr,
    };
  } finally {
    await emitter.flush();
    await sandbox.process.deleteSession(sessionId).catch(() => undefined);
  }
}

async function waitForSessionCommandExit(
  sandbox: SandboxRuntime,
  sessionId: string,
  commandId: string,
  timeout?: number,
) {
  const deadline = timeout === undefined ? undefined : Date.now() + timeout * 1000;
  while (true) {
    const command = await sandbox.process.getSessionCommand(sessionId, commandId);
    if (command.exitCode !== undefined) {
      return command;
    }
    if (deadline !== undefined && Date.now() > deadline) {
      throw new Error(`Daytona command ${commandId} timed out.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function createStreamEmitter(
  ctx: { runMutation: (handle: any, args: any) => Promise<unknown> },
  args: {
    jobId?: string;
    lineBuffered: boolean;
    onOutput?: string;
    runId: string;
    sandboxId: string;
  },
) {
  let sequence = 0;
  let pending = Promise.resolve();
  const buffers = { stderr: "", stdout: "" };
  const output = { stderr: "", stdout: "" };

  const emit = (stream: "stderr" | "stdout", content: string) => {
    if (content.length === 0) {
      return;
    }
    const payload = {
      content,
      runId: args.runId,
      sandboxId: args.sandboxId,
      sequence,
      stream,
      timestamp: Date.now(),
    };
    sequence += 1;
    pending = pending.then(async () => {
      if (args.jobId) {
        await ctx.runMutation(internalApi.appendJobOutput, {
          content,
          jobId: args.jobId,
          now: Date.now(),
        });
      }
      if (args.onOutput) {
        await ctx.runMutation(args.onOutput as any, payload);
      }
    });
  };

  return {
    get stderr() {
      return output.stderr;
    },
    get stdout() {
      return output.stdout;
    },
    flush: async () => {
      emit("stdout", buffers.stdout);
      emit("stderr", buffers.stderr);
      buffers.stdout = "";
      buffers.stderr = "";
      await pending;
    },
    push: (stream: "stderr" | "stdout", chunk: string) => {
      output[stream] += chunk;
      if (!args.lineBuffered) {
        emit(stream, chunk);
        return;
      }
      buffers[stream] += chunk;
      const lines = buffers[stream].split(/\r?\n/);
      buffers[stream] = lines.pop() ?? "";
      for (const line of lines) {
        emit(stream, `${line}\n`);
      }
    },
  };
}

function normalizeOutput(output?: OutputArgs, stream?: StreamArgs): OutputArgs {
  return {
    lineBuffered: output?.lineBuffered ?? stream?.lineBuffered,
    onOutput: output?.onOutput ?? stream?.onChunk,
  };
}

async function captureArtifact(
  ctx: { runMutation: (handle: any, args: any) => Promise<unknown> },
  sandbox: SandboxRuntime,
  capture: CaptureArgs,
) {
  const archivePath = `/tmp/daytona-capture-${randomUUID()}.tar.gz`;
  const source = capture.path;
  const parent = path.posix.dirname(source);
  const base = path.posix.basename(source);
  const archiveCommand = [
    `rm -f ${shellQuote(archivePath)}`,
    `tar -czf ${shellQuote(archivePath)} -C ${shellQuote(parent)} ${shellQuote(base)}`,
  ].join(" && ");
  const archiveResult = await sandbox.process.executeCommand(archiveCommand);
  if (archiveResult.exitCode !== 0) {
    throw new Error(
      `Failed to archive ${source}: ${archiveResult.result || "unknown error"}`,
    );
  }
  const buffer = await sandbox.fs.downloadFile(archivePath);
  let storageId;
  if (capture.uploadUrl) {
    const response = await fetch(capture.uploadUrl, {
      body: buffer as unknown as BodyInit,
      headers: { "content-type": "application/gzip" },
      method: "PUT",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to upload Daytona artifact: HTTP ${response.status}`,
      );
    }
    storageId = await parseStorageId(response);
  }
  const artifact = stripUndefined({
    contentType: "application/gzip",
    path: source,
    size: buffer.byteLength,
    storageId,
    uploadUrl: capture.uploadUrl,
  });
  if (capture.onArtifact) {
    await ctx.runMutation(capture.onArtifact as any, artifact);
  }
  return artifact;
}

async function parseStorageId(response: Response) {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text) as { storageId?: unknown };
    return typeof parsed.storageId === "string" ? parsed.storageId : undefined;
  } catch {
    return undefined;
  }
}

function resolveCallbackSecret(callback?: CallbackArgs) {
  if (callback?.secret === "mint") {
    return randomUUID();
  }
  return callback?.secret;
}

function addCallbackSecret(
  env: Record<string, string> | undefined,
  callback: CallbackArgs | undefined,
  secret: string | undefined,
) {
  if (!secret) {
    return env;
  }
  return {
    ...env,
    [callback?.envName ?? "DAYTONA_CALLBACK_SECRET"]: secret,
  };
}

function makeDaytona(auth: DaytonaAuth) {
  if (!auth.apiKey && !(auth.jwtToken && auth.organizationId)) {
    throw new Error(
      "Provide DAYTONA_API_KEY or both DAYTONA_JWT_TOKEN and DAYTONA_ORGANIZATION_ID.",
    );
  }
  return new Daytona(stripUndefined(auth) as DaytonaConfig);
}

async function resolveSandbox(
  daytona: Daytona,
  args: {
    create?: CreateSandboxArgs;
    createTimeout?: number;
    sandboxId?: string;
  },
) {
  if (args.sandboxId !== undefined) {
    return {
      createdSandbox: false,
      sandbox: await daytona.get(args.sandboxId),
    };
  }
  return {
    createdSandbox: true,
    sandbox: await createNewSandbox(daytona, args.create, args.createTimeout),
  };
}

async function createNewSandbox(
  daytona: Daytona,
  create: CreateSandboxArgs = {},
  createTimeout?: number,
) {
  if (create.image !== undefined && create.snapshot !== undefined) {
    throw new Error("Pass either create.image or create.snapshot, not both.");
  }
  const params = toDaytonaCreateParams(create);
  return await daytona.create(params, { timeout: createTimeout });
}

function toDaytonaCreateParams(create: CreateSandboxArgs) {
  const common = stripUndefined({
    autoArchiveInterval: create.autoArchiveInterval,
    autoDeleteInterval: create.autoDeleteInterval,
    autoStopInterval: create.autoStopInterval,
    envVars: create.envVars,
    ephemeral: create.ephemeral,
    labels: create.labels,
    language: create.language,
    name: create.name,
    networkAllowList: create.networkAllowList,
    networkBlockAll: create.networkBlockAll,
    public: create.public,
    user: create.user,
    volumes: create.volumes,
  });
  if (create.image !== undefined) {
    return stripUndefined({
      ...common,
      image: create.image,
      resources: create.resources,
    }) as CreateSandboxFromImageParams;
  }
  return stripUndefined({
    ...common,
    snapshot: create.snapshot,
  }) as CreateSandboxFromSnapshotParams;
}

function summarizeSandbox(sandbox: SandboxLike) {
  return stripUndefined({
    autoArchiveInterval: sandbox.autoArchiveInterval,
    autoDeleteInterval: sandbox.autoDeleteInterval,
    autoStopInterval: sandbox.autoStopInterval,
    createdAt: sandbox.createdAt,
    disk: sandbox.disk,
    id: sandbox.id,
    labels: sandbox.labels,
    memory: sandbox.memory,
    name: sandbox.name,
    snapshot: sandbox.snapshot,
    state: sandbox.state,
    target: sandbox.target,
    updatedAt: sandbox.updatedAt,
  });
}

function normalizeExecuteResult(result: {
  artifacts?: { charts?: unknown[]; stdout: string };
  exitCode: number;
  result: string;
  stderr?: string;
}) {
  return stripUndefined({
    artifacts:
      result.artifacts === undefined
        ? undefined
        : stripUndefined({
            charts: result.artifacts.charts,
            stdout: result.artifacts.stdout,
          }),
    exitCode: result.exitCode,
    result: result.result,
    stderr: result.stderr,
  });
}

function buildSessionCommand(
  command: string,
  cwd?: string,
  env?: Record<string, string>,
) {
  const parts = [];
  if (cwd) {
    parts.push(`cd ${shellQuote(cwd)}`);
  }
  for (const [key, value] of Object.entries(env ?? {})) {
    assertValidEnvName(key);
    parts.push(`export ${key}=${shellQuote(value)}`);
  }
  parts.push(command);
  return parts.join(" && ");
}

function resolveSandboxPath(filePath: string, cwd?: string) {
  if (path.posix.isAbsolute(filePath) || !cwd) {
    return filePath;
  }
  return path.posix.join(cwd, filePath);
}

function assertValidEnvName(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid environment variable name: ${name}`);
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as {
    [K in keyof T as undefined extends T[K] ? K : K]: Exclude<T[K], undefined>;
  };
}
