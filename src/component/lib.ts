"use node";

import {
  Daytona,
  type CreateSandboxFromImageParams,
  type CreateSandboxFromSnapshotParams,
  type DaytonaConfig,
} from "@daytona/sdk";
import { v, type Infer } from "convex/values";
import { action } from "./_generated/server.js";

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
});

const runResultValidator = v.object({
  createdSandbox: v.boolean(),
  deletedSandbox: v.boolean(),
  result: executeResultValidator,
  sandbox: sandboxSummaryValidator,
});

type DaytonaAuth = Infer<typeof authValidator>;
type CreateSandboxArgs = Infer<typeof createSandboxValidator>;

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

export const createSandbox = action({
  args: {
    auth: authValidator,
    create: v.optional(createSandboxValidator),
    createTimeout: v.optional(v.number()),
  },
  returns: sandboxSummaryValidator,
  handler: async (_ctx, args) => {
    const daytona = makeDaytona(args.auth);
    const sandbox = await createNewSandbox(
      daytona,
      args.create,
      args.createTimeout,
    );
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
    command: v.string(),
    create: v.optional(createSandboxValidator),
    createTimeout: v.optional(v.number()),
    cwd: v.optional(v.string()),
    deleteSandboxAfter: v.optional(v.boolean()),
    deleteTimeout: v.optional(v.number()),
    env: v.optional(recordOfStrings),
    sandboxId: v.optional(v.string()),
    timeout: v.optional(v.number()),
  },
  returns: runResultValidator,
  handler: async (_ctx, args) => {
    const daytona = makeDaytona(args.auth);
    const { sandbox, createdSandbox } = await resolveSandbox(daytona, {
      create: args.create,
      createTimeout: args.createTimeout,
      sandboxId: args.sandboxId,
    });
    const shouldDeleteSandbox = args.deleteSandboxAfter ?? createdSandbox;
    let result;
    let deletedSandbox = false;
    try {
      result = await sandbox.process.executeCommand(
        args.command,
        args.cwd,
        args.env,
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
      result: normalizeExecuteResult(result),
      sandbox: summarizeSandbox(sandbox),
    };
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
      result: normalizeExecuteResult(result),
      sandbox: summarizeSandbox(sandbox),
    };
  },
});

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
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as {
    [K in keyof T as undefined extends T[K] ? K : K]: Exclude<T[K], undefined>;
  };
}
