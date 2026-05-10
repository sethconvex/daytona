import {
  actionGeneric,
  type ArgsArrayForOptionalValidator,
  type ArgsArrayToObject,
  createFunctionHandle,
  type DefaultArgsForOptionalValidator,
  type FunctionHandle,
  type FunctionReference,
  type FunctionVisibility,
  type GenericActionCtx,
  type GenericDataModel,
  type RegisteredAction,
  type ReturnValueForOptionalValidator,
} from "convex/server";
import type { PropertyValidators, Validator } from "convex/values";
import type { ComponentApi } from "../component/_generated/component.js";
import type { RemoteBundle } from "../entry/index.js";

export type RemoteAuth = {
  apiKey?: string;
  apiUrl?: string;
  jwtToken?: string;
  organizationId?: string;
  provider?: SandboxProvider;
  spritesApiUrl?: string;
  spritesToken?: string;
  target?: string;
};

export type SandboxProvider = "daytona" | "sprites";

export type SandboxLanguage = "python" | "typescript" | "javascript";

export type SandboxResources = {
  cpu?: number;
  gpu?: number;
  memory?: number;
  disk?: number;
};

export type VolumeMount = {
  volumeId: string;
  mountPath: string;
};

export type CreateSandboxOptions = {
  autoArchiveInterval?: number;
  autoDeleteInterval?: number;
  autoStopInterval?: number;
  envVars?: Record<string, string>;
  ephemeral?: boolean;
  image?: string;
  labels?: Record<string, string>;
  language?: SandboxLanguage;
  name?: string;
  networkAllowList?: string;
  networkBlockAll?: boolean;
  public?: boolean;
  resources?: SandboxResources;
  snapshot?: string;
  user?: string;
  volumes?: VolumeMount[];
};

export type RemoteStagedFile = {
  content: string;
  encoding?: "utf8" | "base64";
  mode?: string;
  path: string;
};

export type RemoteCommandOutput = {
  content: string;
  runId: string;
  sandboxId: string;
  sequence: number;
  stream: "stdout" | "stderr";
  timestamp: number;
};

export type RemoteCommandArtifact = {
  contentType: string;
  path: string;
  size: number;
  storageId?: string;
  uploadUrl?: string;
};

export type RemotePackageInstall = {
  command?: string;
  manager?: "npm" | "pnpm" | "yarn";
  packages?: string[];
};

export type RemoteCommandSandbox = {
  create?: CreateSandboxOptions;
  deleteAfter?: boolean;
  files?: RemoteStagedFile[];
  id?: string;
  seedDownloadUrl?: string;
};

export type RemoteCommandOutputOptions = {
  lineBuffered?: boolean;
  onOutput?: FunctionReference<
    "mutation",
    FunctionVisibility,
    RemoteCommandOutput,
    unknown
  >;
  redact?: {
    env?: string[];
    patterns?: string[];
    values?: string[];
  };
};

export type RemoteCommandCapture = {
  onArtifact?: FunctionReference<
    "mutation",
    FunctionVisibility,
    RemoteCommandArtifact,
    unknown
  >;
  path: string;
  uploadUrl?: string;
};

export type RemoteCommandCallback = {
  envName?: string;
  secret?: "mint" | string;
};

export type RunCommandOptions = {
  auth?: RemoteAuth;
  callback?: RemoteCommandCallback;
  capture?: RemoteCommandCapture;
  command: string;
  create?: CreateSandboxOptions;
  createTimeout?: number;
  cwd?: string;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  files?: RemoteStagedFile[];
  install?: RemotePackageInstall;
  output?: RemoteCommandOutputOptions;
  sandbox?: RemoteCommandSandbox;
  sandboxId?: string;
  seedDownloadUrl?: string;
  timeout?: number;
};

export type RunCodeOptions = {
  auth?: RemoteAuth;
  argv?: string[];
  code: string;
  create?: CreateSandboxOptions;
  createTimeout?: number;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  language?: SandboxLanguage;
  sandboxId?: string;
  timeout?: number;
};

export type RemoteActionOptions =
  | ({ kind: "command" } & RunCommandOptions)
  | ({ kind: "code" } & RunCodeOptions);

export type RemoteRunnerOptions = {
  auth?: RemoteAuth;
  callbackSecret?: string;
  callbackTtlMs?: number;
  callbackUrl?: string;
  defaultCreate?: CreateSandboxOptions;
  deleteSandboxAfter?: boolean;
};

export type RemoteJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type RemoteJob = {
  artifact?: RemoteCommandArtifact;
  completedAt?: number;
  createdAt: number;
  durationMs?: number;
  error?: string;
  exitCode?: number;
  jobId: string;
  sandboxId?: string;
  startedAt?: number;
  status: RemoteJobStatus;
  updatedAt: number;
};

export type RemoteJobOutput = {
  content: string;
  createdAt: number;
  jobId: string;
  outputId: string;
  runId: string;
  sandboxId: string;
  sequence: number;
  stream: "stdout" | "stderr";
};

export type RemoteJobOutputPage = {
  isDone: boolean;
  nextSequence: number | null;
  output: RemoteJobOutput[];
};

export type RemoteJobPage = {
  isDone: boolean;
  jobs: RemoteJob[];
  nextCursor: string | null;
};

export type RemoteCancelJobsResult = {
  canceled: number;
  isDone: boolean;
  nextCursor: string | null;
  processed: number;
};

export type RemoteCleanupRun = {
  batchSize: number;
  cancelCursor?: string | null;
  cancelOlderThan?: number;
  canceled: number;
  cleanupId: string;
  completedAt?: number;
  createdAt: number;
  deleteCursor?: string | null;
  deleteOlderThan?: number;
  deleted: number;
  error?: string;
  outputCursor?: string | null;
  outputDeleted: number;
  outputOlderThan?: number;
  processed: number;
  status: "running" | "succeeded" | "failed";
  updatedAt: number;
};

type RemoteCallableType = "query" | "mutation" | "action";

type RemoteCallableReference<Type extends RemoteCallableType> =
  FunctionReference<Type, FunctionVisibility, any, any>;

export type RemoteActionFunctions = {
  queries?: Record<string, RemoteCallableReference<"query">>;
  mutations?: Record<string, RemoteCallableReference<"mutation">>;
  actions?: Record<string, RemoteCallableReference<"action">>;
};

export type RemoteActionRuntimeOptions = {
  auth?: RemoteAuth;
  callbackSecret?: string;
  callbackTtlMs?: number;
  callbackUrl?: string;
  create?: Omit<CreateSandboxOptions, "language">;
  createTimeout?: number;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  functions?: RemoteActionFunctions;
  install?: RemotePackageInstall;
  packages?: string[];
  sandboxId?: string;
  timeout?: number;
};

export type RemoteExecResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type RemoteActionContext = {
  actions: Record<
    string,
    <Return = unknown>(args?: Record<string, unknown>) => Promise<Return>
  >;
  exec: (
    command: string,
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      timeoutMs?: number;
    },
  ) => Promise<RemoteExecResult>;
  fs: typeof import("node:fs/promises");
  runAction: <Return = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<Return>;
  runMutation: <Return = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<Return>;
  runQuery: <Return = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<Return>;
  env: Record<string, string | undefined>;
  require: (id: string) => unknown;
  mutations: Record<
    string,
    <Return = unknown>(args?: Record<string, unknown>) => Promise<Return>
  >;
  queries: Record<
    string,
    <Return = unknown>(args?: Record<string, unknown>) => Promise<Return>
  >;
  __dirname: string;
  __filename: string;
};

export type RemoteActionDefinition<
  ArgsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnValue,
  OneOrZeroArgs extends ArgsArrayForOptionalValidator<ArgsValidator>,
  > = RemoteActionRuntimeOptions & {
    args?: ArgsValidator;
    capture?: RemoteCommandCapture;
    cwd?: string;
    files?: RemoteStagedFile[];
    output?: RemoteCommandOutputOptions;
    sandbox?: Omit<CreateSandboxOptions, "language">;
    seedDownloadUrl?: string;
    returns?: ReturnsValidator;
    handler: (
      ctx: RemoteActionContext,
    ...args: OneOrZeroArgs
  ) => ReturnValue | Promise<ReturnValue>;
};

export type RemoteBundledActionDefinition<
  ArgsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnValue,
> = RemoteActionRuntimeOptions & {
  args?: ArgsValidator;
  bundle: RemoteBundle<any, ReturnValue>;
  capture?: RemoteCommandCapture;
  cwd?: string;
  files?: RemoteStagedFile[];
  output?: RemoteCommandOutputOptions;
  sandbox?: Omit<CreateSandboxOptions, "language">;
  seedDownloadUrl?: string;
  returns?: ReturnsValidator;
};

export type RemoteDurableActionDefinition<
  ArgsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
> = RemoteActionRuntimeOptions & {
  args?: ArgsValidator;
  capture?: RemoteCommandCapture;
  cwd?: string;
  files?: RemoteStagedFile[];
  output?: RemoteCommandOutputOptions;
  sandbox?: Omit<CreateSandboxOptions, "language">;
  seedDownloadUrl?: string;
  handler: (
    ctx: RemoteActionContext,
    ...args: ArgsArrayForOptionalValidator<ArgsValidator>
  ) => unknown | Promise<unknown>;
};

type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;
type CallbackActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction" | "runMutation"
>;
type QueryCtx = Pick<GenericActionCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<GenericActionCtx<GenericDataModel>, "runMutation">;

const REMOTE_ACTION_RESULT_MARKER = "__CONVEX_REMOTE_ACTION_RESULT__:";

export class RemoteRunner {
  constructor(
    public component: ComponentApi,
    private options: RemoteRunnerOptions = {},
  ) {}

  async createSandbox(
    ctx: ActionCtx,
    args: {
      auth?: RemoteAuth;
      create?: CreateSandboxOptions;
      createTimeout?: number;
      files?: RemoteStagedFile[];
      install?: RemotePackageInstall;
      seedDownloadUrl?: string;
    } = {},
  ) {
    return await ctx.runAction(this.component.lib.createSandbox, {
      auth: this.auth(args.auth),
      create: mergeCreate(this.options.defaultCreate, args.create),
      createTimeout: args.createTimeout,
      files: args.files,
      install: args.install,
      seedDownloadUrl: args.seedDownloadUrl,
    });
  }

  async deleteSandbox(
    ctx: ActionCtx,
    args: { auth?: RemoteAuth; sandboxId: string; timeout?: number },
  ) {
    return await ctx.runAction(this.component.lib.deleteSandbox, {
      auth: this.auth(args.auth),
      sandboxId: args.sandboxId,
      timeout: args.timeout,
    });
  }

  async getSandbox(
    ctx: ActionCtx,
    args: { auth?: RemoteAuth; sandboxId: string },
  ) {
    return await ctx.runAction(this.component.lib.getSandbox, {
      auth: this.auth(args.auth),
      sandboxId: args.sandboxId,
    });
  }

  async runCommand(ctx: ActionCtx, args: RunCommandOptions) {
    const commandArgs = await this.commandArgs(args);
    return await ctx.runAction(this.component.lib.runCommand, {
      ...commandArgs,
      auth: this.auth(args.auth),
    });
  }

  async startCommand(ctx: ActionCtx, args: RunCommandOptions) {
    const commandArgs = await this.commandArgs(args);
    return await ctx.runAction(this.component.lib.startCommand, {
      ...commandArgs,
      auth: this.auth(args.auth),
    });
  }

  async getJob(ctx: QueryCtx, args: { jobId: string }) {
    return (await ctx.runQuery(this.component.lib.getJob, args as any)) as
      | RemoteJob
      | null;
  }

  async listJobOutput(
    ctx: QueryCtx,
    args: {
      afterSequence?: number;
      jobId: string;
      limit?: number;
    },
  ) {
    return (await ctx.runQuery(
      this.component.lib.listJobOutput,
      args as any,
    )) as RemoteJobOutputPage;
  }

  async cancelJob(ctx: MutationCtx, args: { jobId: string }) {
    return await ctx.runMutation(this.component.lib.cancelJob, args as any);
  }

  async listJobs(
    ctx: QueryCtx,
    args: {
      cursor?: string | null;
      limit?: number;
      status?: RemoteJobStatus;
    } = {},
  ) {
    return (await ctx.runQuery(this.component.lib.listJobs, args as any)) as
      RemoteJobPage;
  }

  async cancelJobs(
    ctx: MutationCtx,
    args: {
      beforeUpdatedAt?: number;
      cursor?: string | null;
      limit?: number;
      status?: RemoteJobStatus;
    } = {},
  ) {
    return (await ctx.runMutation(
      this.component.lib.cancelJobs,
      args as any,
    )) as RemoteCancelJobsResult;
  }

  async startCleanup(
    ctx: MutationCtx,
    args: {
      batchSize?: number;
      cancelActiveOlderThanMs?: number;
      deleteCompletedOlderThanMs?: number;
    },
  ) {
    return (await ctx.runMutation(
      this.component.lib.startCleanup,
      args as any,
    )) as { cleanupId: string };
  }

  async cancelAllJobs(
    ctx: MutationCtx,
    args: {
      batchSize?: number;
      olderThanMs?: number;
    } = {},
  ) {
    return await this.startCleanup(ctx, {
      batchSize: args.batchSize,
      cancelActiveOlderThanMs: args.olderThanMs ?? 0,
    });
  }

  async getCleanup(ctx: QueryCtx, args: { cleanupId: string }) {
    return (await ctx.runQuery(this.component.lib.getCleanup, args as any)) as
      | RemoteCleanupRun
      | null;
  }

  async runCode(ctx: ActionCtx, args: RunCodeOptions) {
    return await ctx.runAction(this.component.lib.runCode, {
      ...args,
      auth: this.auth(args.auth),
      create: mergeCreate(this.options.defaultCreate, args.create),
      deleteSandboxAfter:
        args.deleteSandboxAfter ?? this.options.deleteSandboxAfter,
    });
  }

  async runAction(ctx: ActionCtx, args: RemoteActionOptions) {
    if (args.kind === "command") {
      const { kind: _kind, ...rest } = args;
      return await this.runCommand(ctx, rest);
    }
    const { kind: _kind, ...rest } = args;
    return await this.runCode(ctx, rest);
  }

  /**
   * Define a Convex action whose handler runs as JavaScript in a Remote
   * sandbox. The handler must be self-contained: use globals, dynamic imports,
   * or `require`, and pass data through args/env instead of closing over app
   * variables.
   */
  action<
    ArgsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    ReturnsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    ReturnValue extends ReturnValueForOptionalValidator<ReturnsValidator> = any,
    OneOrZeroArgs extends
      ArgsArrayForOptionalValidator<ArgsValidator> = DefaultArgsForOptionalValidator<ArgsValidator>,
  >(
    definition: RemoteActionDefinition<
      ArgsValidator,
      ReturnsValidator,
      ReturnValue,
      OneOrZeroArgs
    >,
  ): RegisteredAction<
    "public",
    ArgsArrayToObject<OneOrZeroArgs>,
    Awaited<ReturnValue>
  > {
    return this.defineAction(definition);
  }

  /**
   * Define a Convex action whose handler runs in a Node.js process inside a
   * Remote sandbox.
   */
  defineAction<
    ArgsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    ReturnsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    ReturnValue extends ReturnValueForOptionalValidator<ReturnsValidator> = any,
    OneOrZeroArgs extends
      ArgsArrayForOptionalValidator<ArgsValidator> = DefaultArgsForOptionalValidator<ArgsValidator>,
  >(
    definition: RemoteActionDefinition<
      ArgsValidator,
      ReturnsValidator,
      ReturnValue,
      OneOrZeroArgs
    >,
  ): RegisteredAction<
    "public",
    ArgsArrayToObject<OneOrZeroArgs>,
    Awaited<ReturnValue>
  > {
    return actionGeneric({
      args: definition.args as any,
      returns: definition.returns as any,
      handler: async (ctx, actionArgs: unknown = {}) => {
        const callback = await this.callback(ctx, definition);
        const scriptPath = ".convex-remote-runner/action.cjs";
        const result = await this.runCommand(ctx, {
          auth: definition.auth,
          capture: definition.capture,
          command: `node ${shellQuote(scriptPath)}`,
          create: mergeCreate(definition.sandbox, {
            ...definition.create,
            language: "javascript",
          }),
          createTimeout: definition.createTimeout,
          cwd: definition.cwd,
          deleteSandboxAfter: definition.deleteSandboxAfter,
          deleteTimeout: definition.deleteTimeout,
          env: definition.env,
          files: [
            ...(definition.files ?? []),
            {
              path: scriptPath,
              content: buildRemoteActionCode(
                definition.handler as (
                  ctx: RemoteActionContext,
                  ...args: any[]
                ) => unknown,
                actionArgs,
                callback,
              ),
            },
          ],
          install: normalizeInstall(definition),
          output: definition.output,
          sandboxId: definition.sandboxId,
          seedDownloadUrl: definition.seedDownloadUrl,
          timeout: definition.timeout,
        });
        return parseRemoteActionResult(
          result.result.result,
          result.result.exitCode,
        );
      },
    }) as RegisteredAction<
      "public",
      ArgsArrayToObject<OneOrZeroArgs>,
      Awaited<ReturnValue>
    >;
  }

  /**
   * Define a Convex action that starts a durable Remote job and returns its
   * job id immediately. The Remote-side handler uses the same JavaScript
   * runtime context as `defineAction`, while output is stored incrementally in
   * the component's job output table.
   */
  defineDurableAction<
    ArgsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    OneOrZeroArgs extends
      ArgsArrayForOptionalValidator<ArgsValidator> = DefaultArgsForOptionalValidator<ArgsValidator>,
  >(
    definition: RemoteDurableActionDefinition<ArgsValidator>,
  ): RegisteredAction<
    "public",
    ArgsArrayToObject<OneOrZeroArgs>,
    { jobId: string }
  > {
    return actionGeneric({
      args: definition.args as any,
      returns: undefined,
      handler: async (ctx, actionArgs: unknown = {}) => {
        const callback = await this.callback(ctx, definition);
        const scriptPath = ".convex-remote-runner/durable-action.cjs";
        return await this.startCommand(ctx, {
          auth: definition.auth,
          capture: definition.capture,
          command: `node ${shellQuote(scriptPath)}`,
          create: mergeCreate(definition.sandbox, {
            ...definition.create,
            language: "javascript",
          }),
          createTimeout: definition.createTimeout,
          cwd: definition.cwd,
          deleteSandboxAfter: definition.deleteSandboxAfter,
          deleteTimeout: definition.deleteTimeout,
          env: definition.env,
          files: [
            ...(definition.files ?? []),
            {
              path: scriptPath,
              content: buildRemoteDurableActionCode(
                definition.handler as (
                  ctx: RemoteActionContext,
                  ...args: any[]
                ) => unknown,
                actionArgs,
                callback,
              ),
            },
          ],
          install: normalizeInstall(definition),
          output: definition.output ?? { lineBuffered: true },
          sandboxId: definition.sandboxId,
          seedDownloadUrl: definition.seedDownloadUrl,
          timeout: definition.timeout,
        });
      },
    }) as RegisteredAction<
      "public",
      ArgsArrayToObject<OneOrZeroArgs>,
      { jobId: string }
    >;
  }

  /**
   * Define a Convex action whose implementation is a TypeScript module bundled
   * by `convex-remote-runner build`. This lets Remote-side code import pure helpers
   * from the app's `convex/` directory while still calling Convex functions only
   * through the explicit functions map generated with the bundle.
   */
  defineBundledAction<
    ArgsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    ReturnsValidator extends
      | PropertyValidators
      | Validator<any, "required", any>
      | void,
    ReturnValue extends ReturnValueForOptionalValidator<ReturnsValidator> = any,
    OneOrZeroArgs extends
      ArgsArrayForOptionalValidator<ArgsValidator> = DefaultArgsForOptionalValidator<ArgsValidator>,
  >(
    definition: RemoteBundledActionDefinition<
      ArgsValidator,
      ReturnsValidator,
      ReturnValue
    >,
  ): RegisteredAction<
    "public",
    ArgsArrayToObject<OneOrZeroArgs>,
    Awaited<ReturnValue>
  > {
    return actionGeneric({
      args: definition.args as any,
      returns: definition.returns as any,
      handler: async (ctx, actionArgs: unknown = {}) => {
        const callback = await this.callback(ctx, {
          ...definition,
          functions: definition.functions ?? definition.bundle.functions,
        });
        const scriptPath = ".convex-remote-runner/runner.cjs";
        const result = await this.runCommand(ctx, {
          auth: definition.auth,
          capture: definition.capture,
          command: `node ${shellQuote(scriptPath)}`,
          create: mergeCreate(definition.sandbox, {
            ...definition.create,
            language: "javascript",
          }),
          createTimeout: definition.createTimeout,
          cwd: definition.cwd,
          deleteSandboxAfter: definition.deleteSandboxAfter,
          deleteTimeout: definition.deleteTimeout,
          env: definition.env,
          files: [
            ...(definition.files ?? []),
            ...definition.bundle.files,
            {
              path: scriptPath,
              content: buildRemoteBundledActionCode(
                definition.bundle.entrypoint,
                actionArgs,
                callback,
              ),
            },
          ],
          install: normalizeInstall({
            ...definition,
            packages: [
              ...(definition.bundle.packages ?? []),
              ...(definition.packages ?? []),
            ],
          }),
          output: definition.output,
          sandboxId: definition.sandboxId,
          seedDownloadUrl: definition.seedDownloadUrl,
          timeout: definition.timeout,
        });
        return parseRemoteActionResult(
          result.result.result,
          result.result.exitCode,
        );
      },
    }) as RegisteredAction<
      "public",
      ArgsArrayToObject<OneOrZeroArgs>,
      Awaited<ReturnValue>
    >;
  }

  private async commandArgs(args: RunCommandOptions) {
    const capture =
      args.capture === undefined
        ? undefined
        : {
            onArtifact:
              args.capture.onArtifact === undefined
                ? undefined
                : await createFunctionHandle(args.capture.onArtifact),
            path: args.capture.path,
            uploadUrl: args.capture.uploadUrl,
          };
    const output =
      args.output === undefined
        ? undefined
        : {
            lineBuffered: args.output.lineBuffered,
            onOutput:
              args.output.onOutput === undefined
                ? undefined
                : await createFunctionHandle(args.output.onOutput),
            redact: args.output.redact,
          };
    return {
      ...args,
      create: mergeCreate(this.options.defaultCreate, args.create),
      capture,
      deleteSandboxAfter:
        args.deleteSandboxAfter ?? this.options.deleteSandboxAfter,
      sandbox:
        args.sandbox === undefined
          ? undefined
          : {
              ...args.sandbox,
              create: mergeCreate(this.options.defaultCreate, args.sandbox.create),
            },
      output,
    };
  }

  private auth(overrides?: RemoteAuth) {
    const auth = stripUndefined({
      apiKey:
        overrides?.apiKey ??
        this.options.auth?.apiKey ??
        process.env.DAYTONA_API_KEY,
      apiUrl:
        overrides?.apiUrl ??
        this.options.auth?.apiUrl ??
        process.env.DAYTONA_API_URL ??
        process.env.DAYTONA_SERVER_URL,
      jwtToken:
        overrides?.jwtToken ??
        this.options.auth?.jwtToken ??
        process.env.DAYTONA_JWT_TOKEN,
      organizationId:
        overrides?.organizationId ??
        this.options.auth?.organizationId ??
        process.env.DAYTONA_ORGANIZATION_ID,
      provider:
        overrides?.provider ??
        this.options.auth?.provider ??
        envProvider(
          process.env.REMOTE_RUNNER_PROVIDER ??
            process.env.SANDBOX_PROVIDER ??
            process.env.DAYTONA_PROVIDER,
        ),
      spritesApiUrl:
        overrides?.spritesApiUrl ??
        this.options.auth?.spritesApiUrl ??
        process.env.SPRITES_API_URL,
      spritesToken:
        overrides?.spritesToken ??
        this.options.auth?.spritesToken ??
        process.env.SPRITES_TOKEN ??
        process.env.SPRITE_TOKEN,
      target:
        overrides?.target ??
        this.options.auth?.target ??
        process.env.DAYTONA_TARGET,
    });
    if ((auth.provider ?? "daytona") === "sprites") {
      if (!auth.spritesToken) {
        throw new Error("Set SPRITES_TOKEN or pass auth: { provider: \"sprites\", spritesToken }.");
      }
      return auth;
    }
    if (!auth.apiKey && !(auth.jwtToken && auth.organizationId)) {
      throw new Error(
        "Set DAYTONA_API_KEY, or set DAYTONA_JWT_TOKEN and DAYTONA_ORGANIZATION_ID.",
      );
    }
    return auth;
  }

  private async callback(
    ctx: CallbackActionCtx,
    args: RemoteActionRuntimeOptions,
  ) {
    if (!hasFunctions(args.functions)) {
      return undefined;
    }

    const explicitCallbackUrl =
      args.callbackUrl ??
      this.options.callbackUrl ??
      process.env.REMOTE_RUNNER_CALLBACK_URL ??
      process.env.DAYTONA_CALLBACK_URL;
    const callbackUrl = explicitCallbackUrl ?? defaultCallbackUrl();
    const callbackSecret =
      args.callbackSecret ??
      this.options.callbackSecret ??
      process.env.REMOTE_RUNNER_CALLBACK_SECRET ??
      process.env.DAYTONA_CALLBACK_SECRET ??
      crypto.randomUUID();

    if (!callbackUrl) {
      throw new Error(
        "To use ctx.runQuery/runMutation/runAction from a remote action, mount @convex-dev/remote-runner with httpPrefix \"/remote-runner/\", set CONVEX_SITE_URL, or pass callbackUrl to RemoteRunner.",
      );
    }
    if (
      explicitCallbackUrl !== undefined &&
      args.callbackSecret === undefined &&
      this.options.callbackSecret === undefined &&
      process.env.REMOTE_RUNNER_CALLBACK_SECRET === undefined &&
      process.env.DAYTONA_CALLBACK_SECRET === undefined
    ) {
      throw new Error(
        "Pass callbackSecret or set REMOTE_RUNNER_CALLBACK_SECRET when using a custom callbackUrl.",
      );
    }

    await ctx.runMutation(this.component.lib.registerCallbackSecret, {
      expiresAt:
        Date.now() +
        (args.callbackTtlMs ??
          this.options.callbackTtlMs ??
          24 * 60 * 60 * 1000),
      secret: callbackSecret,
    });

    return {
      functions: await createFunctionHandleMaps(args.functions),
      secret: callbackSecret,
      url: callbackUrl,
    };
  }
}

type RemoteSerializedCallbacks = {
  functions: {
    actions: Record<string, string>;
    mutations: Record<string, string>;
    queries: Record<string, string>;
  };
  secret: string;
  url: string;
};

function buildRemoteActionCode(
  handler: (ctx: RemoteActionContext, ...args: any[]) => unknown,
  args: unknown,
  callback: RemoteSerializedCallbacks | undefined,
) {
  const source = handler.toString();
  return buildRemoteActionRuntimeCode({
    args,
    callback,
    emitResult: true,
    handlerExpression: `(${source})`,
  });
}

function buildRemoteDurableActionCode(
  handler: (ctx: RemoteActionContext, ...args: any[]) => unknown,
  args: unknown,
  callback: RemoteSerializedCallbacks | undefined,
) {
  const source = handler.toString();
  return buildRemoteActionRuntimeCode({
    args,
    callback,
    emitResult: false,
    handlerExpression: `(${source})`,
  });
}

function buildRemoteBundledActionCode(
  entrypoint: string,
  args: unknown,
  callback: RemoteSerializedCallbacks | undefined,
) {
  return buildRemoteActionRuntimeCode({
    args,
    callback,
    emitResult: true,
    handlerExpression: `
      await (async () => {
        const { pathToFileURL } = await import("node:url");
        const path = await import("node:path");
        const entryUrl = pathToFileURL(path.resolve(process.cwd(), ${JSON.stringify(entrypoint)})).href;
        const module = await import(entryUrl);
        const handler = module.default ?? module.handler;
        if (typeof handler !== "function") {
          throw new Error("Remote bundle " + ${JSON.stringify(entrypoint)} + " must export a default handler function.");
        }
        return handler;
      })()
    `,
  });
}

function buildRemoteActionRuntimeCode(args: {
  args: unknown;
  callback: RemoteSerializedCallbacks | undefined;
  emitResult: boolean;
  handlerExpression: string;
}) {
  const payload = base64EncodeUtf8(
    JSON.stringify({ args: args.args, callback: args.callback }),
  );
  return `
(async () => {
  const __marker = ${JSON.stringify(REMOTE_ACTION_RESULT_MARKER)};
  const __payload = JSON.parse(Buffer.from(${JSON.stringify(payload)}, "base64").toString("utf8"));
  const __serializeError = (error) => ({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
    stack: error instanceof Error ? error.stack : undefined,
  });
  const __callConvex = async (kind, name, args = {}) => {
    const callback = __payload.callback;
    if (!callback) {
      throw new Error("No Remote callback bridge is configured for this action.");
    }
    const collections = {
      action: callback.functions.actions,
      mutation: callback.functions.mutations,
      query: callback.functions.queries,
    };
    const handle = collections[kind]?.[name];
    if (!handle) {
      throw new Error("Remote action cannot run " + kind + " '" + name + "'. Add it to the action's functions map.");
    }
    const response = await fetch(callback.url, {
      method: "POST",
      headers: {
        "authorization": "Bearer " + callback.secret,
        "content-type": "application/json",
      },
      body: JSON.stringify({ kind, handle, args }),
    });
    const text = await response.text();
    let payload;
    try {
      payload = text.length ? JSON.parse(text) : null;
    } catch (error) {
      throw new Error("Invalid Convex callback response: " + text);
    }
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error?.message ?? ("Convex callback failed with HTTP " + response.status));
    }
    return payload.value ?? null;
  };

  try {
    const fs = await import("node:fs/promises");
    const { exec: execCallback } = await import("node:child_process");
    const { createRequire } = await import("node:module");
    const { promisify } = await import("node:util");
    const execAsync = promisify(execCallback);
    const require = createRequire(process.cwd() + "/remote-action.js");
    const __dirname = process.cwd();
    const __filename = __dirname + "/remote-action.js";
    const __makeConvexProxy = (kind) => {
      const callback = __payload.callback;
      const collections = {
        action: callback?.functions.actions ?? {},
        mutation: callback?.functions.mutations ?? {},
        query: callback?.functions.queries ?? {},
      };
      return Object.fromEntries(
        Object.keys(collections[kind]).map((name) => [
          name,
          (args) => __callConvex(kind, name, args),
        ]),
      );
    };
    const __exec = async (command, options = {}) => {
      const execOptions = {
        cwd: options.cwd,
        env: { ...process.env, ...(options.env ?? {}) },
        timeout: options.timeoutMs,
      };
      try {
        const result = await execAsync(command, execOptions);
        return {
          exitCode: 0,
          stderr: result.stderr,
          stdout: result.stdout,
        };
      } catch (error) {
        return {
          exitCode: typeof error?.code === "number" ? error.code : 1,
          stderr: String(error?.stderr ?? error?.message ?? ""),
          stdout: String(error?.stdout ?? ""),
        };
      }
    };
    const __ctx = {
      actions: __makeConvexProxy("action"),
      exec: __exec,
      fs,
      mutations: __makeConvexProxy("mutation"),
      queries: __makeConvexProxy("query"),
      runAction: (name, args) => __callConvex("action", name, args),
      runMutation: (name, args) => __callConvex("mutation", name, args),
      runQuery: (name, args) => __callConvex("query", name, args),
      env: process.env,
      require,
      __dirname,
      __filename,
    };
    const __handler = ${args.handlerExpression};
    const __value = await __handler(__ctx, __payload.args);
    ${
      args.emitResult
        ? `console.log(__marker + JSON.stringify({
      ok: true,
      value: __value === undefined ? null : __value,
    }));`
        : `void __value;`
    }
  } catch (error) {
    ${
      args.emitResult
        ? `console.log(__marker + JSON.stringify({
      ok: false,
      error: __serializeError(error),
    }));`
        : `console.error(error instanceof Error && error.stack ? error.stack : String(error));`
    }
    process.exitCode = 1;
  }
})();
`;
}

function base64EncodeUtf8(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function parseRemoteActionResult(output: string, exitCode: number) {
  const markerIndex = output.lastIndexOf(REMOTE_ACTION_RESULT_MARKER);
  if (markerIndex === -1) {
    throw new Error(
      `Remote action did not produce a result marker. Exit code: ${exitCode}. Output:\n${output}`,
    );
  }

  const afterMarker = output.slice(
    markerIndex + REMOTE_ACTION_RESULT_MARKER.length,
  );
  const [line] = afterMarker.split(/\r?\n/, 1);
  let payload: {
    ok: boolean;
    value?: unknown;
    error?: { message?: string; name?: string; stack?: string };
  };
  try {
    payload = JSON.parse(line);
  } catch (error) {
    throw new Error(
      `Remote action produced an invalid result payload: ${line}`,
      { cause: error },
    );
  }

  if (!payload.ok) {
    const remoteError = payload.error;
    const message =
      remoteError?.message ?? `Remote action failed with exit code ${exitCode}`;
    const error = new Error(message);
    error.name = remoteError?.name ?? "RemoteActionError";
    if (remoteError?.stack) {
      error.stack = remoteError.stack;
    }
    throw error;
  }

  return payload.value ?? null;
}

function normalizeInstall(args: RemoteActionRuntimeOptions) {
  if (!args.packages?.length) {
    return args.install;
  }
  return {
    ...args.install,
    packages: [...(args.install?.packages ?? []), ...args.packages],
  };
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function createFunctionHandleMaps(functions?: RemoteActionFunctions) {
  return {
    actions: await createFunctionHandleMap(functions?.actions),
    mutations: await createFunctionHandleMap(functions?.mutations),
    queries: await createFunctionHandleMap(functions?.queries),
  };
}

async function createFunctionHandleMap<Type extends RemoteCallableType>(
  functions?: Record<string, RemoteCallableReference<Type>>,
) {
  const entries = await Promise.all(
    Object.entries(functions ?? {}).map(async ([name, reference]) => [
      name,
      await createFunctionHandle(reference),
    ]),
  );
  return Object.fromEntries(entries) as Record<string, string>;
}

function hasFunctions(functions?: RemoteActionFunctions) {
  return (
    functions !== undefined &&
    (Object.keys(functions.queries ?? {}).length > 0 ||
      Object.keys(functions.mutations ?? {}).length > 0 ||
      Object.keys(functions.actions ?? {}).length > 0)
  );
}

function defaultCallbackUrl() {
  const siteUrl = process.env.CONVEX_SITE_URL;
  if (!siteUrl) {
    return undefined;
  }
  return `${siteUrl.replace(/\/$/, "")}/remote-runner/callback`;
}

function envProvider(value: string | undefined): SandboxProvider | undefined {
  if (value === "sprites" || value === "daytona") {
    return value;
  }
  return undefined;
}

export type RemoteCallbackOptions = {
  secret?: string;
};

export function remoteCallback(options: RemoteCallbackOptions = {}) {
  return async (
    ctx: Pick<
      GenericActionCtx<GenericDataModel>,
      "runAction" | "runMutation" | "runQuery"
    >,
    request: Request,
  ) => {
    const secret =
      options.secret ??
      process.env.REMOTE_RUNNER_CALLBACK_SECRET ??
      process.env.DAYTONA_CALLBACK_SECRET;
    if (!secret) {
      return jsonResponse(
        {
          ok: false,
          error: { message: "REMOTE_RUNNER_CALLBACK_SECRET is not configured." },
        },
        500,
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return jsonResponse(
        { ok: false, error: { message: "Unauthorized." } },
        401,
      );
    }

    let body: {
      args?: Record<string, unknown>;
      handle?: string;
      kind?: RemoteCallableType;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: { message: "Invalid JSON callback request." },
        },
        400,
      );
    }

    if (
      body.kind !== "query" &&
      body.kind !== "mutation" &&
      body.kind !== "action"
    ) {
      return jsonResponse(
        { ok: false, error: { message: "Invalid callback kind." } },
        400,
      );
    }
    if (typeof body.handle !== "string") {
      return jsonResponse(
        { ok: false, error: { message: "Missing callback function handle." } },
        400,
      );
    }

    try {
      const args = body.args ?? {};
      const value =
        body.kind === "query"
          ? await ctx.runQuery(
              body.handle as FunctionHandle<"query">,
              args as any,
            )
          : body.kind === "mutation"
            ? await ctx.runMutation(
                body.handle as FunctionHandle<"mutation">,
                args as any,
              )
            : await ctx.runAction(
                body.handle as FunctionHandle<"action">,
                args as any,
              );
      return jsonResponse({ ok: true, value: value ?? null }, 200);
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: serializeError(error),
        },
        500,
      );
    }
  };
}

export type DaytonaAuth = RemoteAuth;
export type DaytonaStagedFile = RemoteStagedFile;
export type DaytonaCommandOutput = RemoteCommandOutput;
export type DaytonaCommandArtifact = RemoteCommandArtifact;
export type DaytonaPackageInstall = RemotePackageInstall;
export type DaytonaCommandSandbox = RemoteCommandSandbox;
export type DaytonaCommandOutputOptions = RemoteCommandOutputOptions;
export type DaytonaCommandCapture = RemoteCommandCapture;
export type DaytonaCommandCallback = RemoteCommandCallback;
export type DaytonaActionOptions = RemoteActionOptions;
export type DaytonaRunnerOptions = RemoteRunnerOptions;
export type DaytonaJobStatus = RemoteJobStatus;
export type DaytonaJob = RemoteJob;
export type DaytonaJobOutput = RemoteJobOutput;
export type DaytonaJobOutputPage = RemoteJobOutputPage;
export type DaytonaJobPage = RemoteJobPage;
export type DaytonaCancelJobsResult = RemoteCancelJobsResult;
export type DaytonaCleanupRun = RemoteCleanupRun;
export type DaytonaActionFunctions = RemoteActionFunctions;
export type DaytonaActionRuntimeOptions = RemoteActionRuntimeOptions;
export type DaytonaExecResult = RemoteExecResult;
export type DaytonaActionContext = RemoteActionContext;
export type DaytonaActionDefinition<
  ArgsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnValue,
  OneOrZeroArgs extends ArgsArrayForOptionalValidator<ArgsValidator>,
> = RemoteActionDefinition<
  ArgsValidator,
  ReturnsValidator,
  ReturnValue,
  OneOrZeroArgs
>;
export type DaytonaBundledActionDefinition<
  ArgsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
  ReturnValue,
> = RemoteBundledActionDefinition<ArgsValidator, ReturnsValidator, ReturnValue>;
export type DaytonaDurableActionDefinition<
  ArgsValidator extends
    | PropertyValidators
    | Validator<any, "required", any>
    | void,
> = RemoteDurableActionDefinition<ArgsValidator>;
export const DaytonaRunner = RemoteRunner;
export const daytonaCallback = remoteCallback;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function serializeError(error: unknown) {
  return {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
    stack: error instanceof Error ? error.stack : undefined,
  };
}

function mergeCreate(
  defaults?: CreateSandboxOptions,
  overrides?: CreateSandboxOptions,
) {
  if (defaults === undefined && overrides === undefined) {
    return undefined;
  }
  return stripUndefined({
    ...defaults,
    ...overrides,
    envVars:
      defaults?.envVars === undefined && overrides?.envVars === undefined
        ? undefined
        : { ...defaults?.envVars, ...overrides?.envVars },
    labels:
      defaults?.labels === undefined && overrides?.labels === undefined
        ? undefined
        : { ...defaults?.labels, ...overrides?.labels },
    resources:
      defaults?.resources === undefined && overrides?.resources === undefined
        ? undefined
        : { ...defaults?.resources, ...overrides?.resources },
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as {
    [K in keyof T as undefined extends T[K] ? K : K]: Exclude<T[K], undefined>;
  };
}
