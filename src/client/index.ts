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

export type DaytonaAuth = {
  apiKey?: string;
  apiUrl?: string;
  jwtToken?: string;
  organizationId?: string;
  target?: string;
};

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

export type DaytonaStagedFile = {
  content: string;
  encoding?: "utf8" | "base64";
  mode?: string;
  path: string;
};

export type DaytonaCommandOutput = {
  content: string;
  runId: string;
  sandboxId: string;
  sequence: number;
  stream: "stdout" | "stderr";
  timestamp: number;
};

export type DaytonaCommandArtifact = {
  contentType: string;
  path: string;
  size: number;
  storageId?: string;
  uploadUrl?: string;
};

export type DaytonaPackageInstall = {
  command?: string;
  manager?: "npm" | "pnpm" | "yarn";
  packages?: string[];
};

export type DaytonaCommandSandbox = {
  create?: CreateSandboxOptions;
  deleteAfter?: boolean;
  files?: DaytonaStagedFile[];
  id?: string;
  seedDownloadUrl?: string;
};

export type DaytonaCommandOutputOptions = {
  lineBuffered?: boolean;
  onOutput?: FunctionReference<
    "mutation",
    FunctionVisibility,
    DaytonaCommandOutput,
    unknown
  >;
};

export type DaytonaCommandCapture = {
  onArtifact?: FunctionReference<
    "mutation",
    FunctionVisibility,
    DaytonaCommandArtifact,
    unknown
  >;
  path: string;
  uploadUrl?: string;
};

export type DaytonaCommandCallback = {
  envName?: string;
  secret?: "mint" | string;
};

export type RunCommandOptions = {
  auth?: DaytonaAuth;
  callback?: DaytonaCommandCallback;
  capture?: DaytonaCommandCapture;
  command: string;
  create?: CreateSandboxOptions;
  createTimeout?: number;
  cwd?: string;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  files?: DaytonaStagedFile[];
  install?: DaytonaPackageInstall;
  output?: DaytonaCommandOutputOptions;
  sandbox?: DaytonaCommandSandbox;
  sandboxId?: string;
  seedDownloadUrl?: string;
  timeout?: number;
};

export type RunCodeOptions = {
  auth?: DaytonaAuth;
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

export type DaytonaActionOptions =
  | ({ kind: "command" } & RunCommandOptions)
  | ({ kind: "code" } & RunCodeOptions);

export type DaytonaRunnerOptions = {
  auth?: DaytonaAuth;
  callbackSecret?: string;
  callbackTtlMs?: number;
  callbackUrl?: string;
  defaultCreate?: CreateSandboxOptions;
  deleteSandboxAfter?: boolean;
};

export type DaytonaJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type DaytonaJob = {
  artifact?: DaytonaCommandArtifact;
  completedAt?: number;
  createdAt: number;
  durationMs?: number;
  error?: string;
  exitCode?: number;
  jobId: string;
  output: string;
  sandboxId?: string;
  startedAt?: number;
  status: DaytonaJobStatus;
  updatedAt: number;
};

type DaytonaCallableType = "query" | "mutation" | "action";

type DaytonaCallableReference<Type extends DaytonaCallableType> =
  FunctionReference<Type, FunctionVisibility, any, any>;

export type DaytonaActionFunctions = {
  queries?: Record<string, DaytonaCallableReference<"query">>;
  mutations?: Record<string, DaytonaCallableReference<"mutation">>;
  actions?: Record<string, DaytonaCallableReference<"action">>;
};

export type DaytonaActionRuntimeOptions = {
  auth?: DaytonaAuth;
  callbackSecret?: string;
  callbackTtlMs?: number;
  callbackUrl?: string;
  create?: Omit<CreateSandboxOptions, "language">;
  createTimeout?: number;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  functions?: DaytonaActionFunctions;
  install?: DaytonaPackageInstall;
  packages?: string[];
  sandboxId?: string;
  timeout?: number;
};

export type DaytonaExecResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type DaytonaActionContext = {
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
  ) => Promise<DaytonaExecResult>;
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
  > = DaytonaActionRuntimeOptions & {
    args?: ArgsValidator;
    capture?: DaytonaCommandCapture;
    cwd?: string;
    files?: DaytonaStagedFile[];
    output?: DaytonaCommandOutputOptions;
    sandbox?: Omit<CreateSandboxOptions, "language">;
    seedDownloadUrl?: string;
    returns?: ReturnsValidator;
    handler: (
      ctx: DaytonaActionContext,
    ...args: OneOrZeroArgs
  ) => ReturnValue | Promise<ReturnValue>;
};

type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;
type CallbackActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runAction" | "runMutation"
>;
type QueryCtx = Pick<GenericActionCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<GenericActionCtx<GenericDataModel>, "runMutation">;

const DAYTONA_ACTION_RESULT_MARKER = "__CONVEX_DAYTONA_ACTION_RESULT__:";

export class DaytonaRunner {
  constructor(
    public component: ComponentApi,
    private options: DaytonaRunnerOptions = {},
  ) {}

  async createSandbox(
    ctx: ActionCtx,
    args: {
      auth?: DaytonaAuth;
      create?: CreateSandboxOptions;
      createTimeout?: number;
      files?: DaytonaStagedFile[];
      install?: DaytonaPackageInstall;
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
    args: { auth?: DaytonaAuth; sandboxId: string; timeout?: number },
  ) {
    return await ctx.runAction(this.component.lib.deleteSandbox, {
      auth: this.auth(args.auth),
      sandboxId: args.sandboxId,
      timeout: args.timeout,
    });
  }

  async getSandbox(
    ctx: ActionCtx,
    args: { auth?: DaytonaAuth; sandboxId: string },
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
      | DaytonaJob
      | null;
  }

  async cancelJob(ctx: MutationCtx, args: { jobId: string }) {
    return await ctx.runMutation(this.component.lib.cancelJob, args as any);
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

  async runAction(ctx: ActionCtx, args: DaytonaActionOptions) {
    if (args.kind === "command") {
      const { kind: _kind, ...rest } = args;
      return await this.runCommand(ctx, rest);
    }
    const { kind: _kind, ...rest } = args;
    return await this.runCode(ctx, rest);
  }

  /**
   * Define a Convex action whose handler runs as JavaScript in a Daytona
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
    definition: DaytonaActionDefinition<
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
   * Daytona sandbox.
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
    definition: DaytonaActionDefinition<
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
        const scriptPath = ".convex-daytona/action.cjs";
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
              content: buildDaytonaActionCode(
                definition.handler as (
                  ctx: DaytonaActionContext,
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
        return parseDaytonaActionResult(
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

  private auth(overrides?: DaytonaAuth) {
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
      target:
        overrides?.target ??
        this.options.auth?.target ??
        process.env.DAYTONA_TARGET,
    });
    if (!auth.apiKey && !(auth.jwtToken && auth.organizationId)) {
      throw new Error(
        "Set DAYTONA_API_KEY, or set DAYTONA_JWT_TOKEN and DAYTONA_ORGANIZATION_ID.",
      );
    }
    return auth;
  }

  private async callback(
    ctx: CallbackActionCtx,
    args: DaytonaActionRuntimeOptions,
  ) {
    if (!hasFunctions(args.functions)) {
      return undefined;
    }

    const explicitCallbackUrl =
      args.callbackUrl ??
      this.options.callbackUrl ??
      process.env.DAYTONA_CALLBACK_URL;
    const callbackUrl = explicitCallbackUrl ?? defaultCallbackUrl();
    const callbackSecret =
      args.callbackSecret ??
      this.options.callbackSecret ??
      process.env.DAYTONA_CALLBACK_SECRET ??
      crypto.randomUUID();

    if (!callbackUrl) {
      throw new Error(
        "To use ctx.runQuery/runMutation/runAction from a Daytona action, mount @convex-dev/daytona with httpPrefix \"/daytona/\", set CONVEX_SITE_URL, or pass callbackUrl to DaytonaRunner.",
      );
    }
    if (
      explicitCallbackUrl !== undefined &&
      args.callbackSecret === undefined &&
      this.options.callbackSecret === undefined &&
      process.env.DAYTONA_CALLBACK_SECRET === undefined
    ) {
      throw new Error(
        "Pass callbackSecret or set DAYTONA_CALLBACK_SECRET when using a custom callbackUrl.",
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

type DaytonaSerializedCallbacks = {
  functions: {
    actions: Record<string, string>;
    mutations: Record<string, string>;
    queries: Record<string, string>;
  };
  secret: string;
  url: string;
};

function buildDaytonaActionCode(
  handler: (ctx: DaytonaActionContext, ...args: any[]) => unknown,
  args: unknown,
  callback: DaytonaSerializedCallbacks | undefined,
) {
  const source = handler.toString();
  const payload = base64EncodeUtf8(JSON.stringify({ args, callback }));
  return `
(async () => {
  const __marker = ${JSON.stringify(DAYTONA_ACTION_RESULT_MARKER)};
  const __payload = JSON.parse(Buffer.from(${JSON.stringify(payload)}, "base64").toString("utf8"));
  const __serializeError = (error) => ({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
    stack: error instanceof Error ? error.stack : undefined,
  });
  const __callConvex = async (kind, name, args = {}) => {
    const callback = __payload.callback;
    if (!callback) {
      throw new Error("No Daytona callback bridge is configured for this action.");
    }
    const collections = {
      action: callback.functions.actions,
      mutation: callback.functions.mutations,
      query: callback.functions.queries,
    };
    const handle = collections[kind]?.[name];
    if (!handle) {
      throw new Error("Daytona action cannot run " + kind + " '" + name + "'. Add it to the action's functions map.");
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
    const require = createRequire(process.cwd() + "/daytona-action.js");
    const __dirname = process.cwd();
    const __filename = __dirname + "/daytona-action.js";
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
    const __handler = (${source});
    const __value = await __handler(__ctx, __payload.args);
    console.log(__marker + JSON.stringify({
      ok: true,
      value: __value === undefined ? null : __value,
    }));
  } catch (error) {
    console.log(__marker + JSON.stringify({
      ok: false,
      error: __serializeError(error),
    }));
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

function parseDaytonaActionResult(output: string, exitCode: number) {
  const markerIndex = output.lastIndexOf(DAYTONA_ACTION_RESULT_MARKER);
  if (markerIndex === -1) {
    throw new Error(
      `Daytona action did not produce a result marker. Exit code: ${exitCode}. Output:\n${output}`,
    );
  }

  const afterMarker = output.slice(
    markerIndex + DAYTONA_ACTION_RESULT_MARKER.length,
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
      `Daytona action produced an invalid result payload: ${line}`,
      { cause: error },
    );
  }

  if (!payload.ok) {
    const remoteError = payload.error;
    const message =
      remoteError?.message ?? `Daytona action failed with exit code ${exitCode}`;
    const error = new Error(message);
    error.name = remoteError?.name ?? "DaytonaActionError";
    if (remoteError?.stack) {
      error.stack = remoteError.stack;
    }
    throw error;
  }

  return payload.value ?? null;
}

function normalizeInstall(args: DaytonaActionRuntimeOptions) {
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

async function createFunctionHandleMaps(functions?: DaytonaActionFunctions) {
  return {
    actions: await createFunctionHandleMap(functions?.actions),
    mutations: await createFunctionHandleMap(functions?.mutations),
    queries: await createFunctionHandleMap(functions?.queries),
  };
}

async function createFunctionHandleMap<Type extends DaytonaCallableType>(
  functions?: Record<string, DaytonaCallableReference<Type>>,
) {
  const entries = await Promise.all(
    Object.entries(functions ?? {}).map(async ([name, reference]) => [
      name,
      await createFunctionHandle(reference),
    ]),
  );
  return Object.fromEntries(entries) as Record<string, string>;
}

function hasFunctions(functions?: DaytonaActionFunctions) {
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
  return `${siteUrl.replace(/\/$/, "")}/daytona/callback`;
}

export type DaytonaCallbackOptions = {
  secret?: string;
};

export function daytonaCallback(options: DaytonaCallbackOptions = {}) {
  return async (
    ctx: Pick<
      GenericActionCtx<GenericDataModel>,
      "runAction" | "runMutation" | "runQuery"
    >,
    request: Request,
  ) => {
    const secret = options.secret ?? process.env.DAYTONA_CALLBACK_SECRET;
    if (!secret) {
      return jsonResponse(
        {
          ok: false,
          error: { message: "DAYTONA_CALLBACK_SECRET is not configured." },
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
      kind?: DaytonaCallableType;
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
