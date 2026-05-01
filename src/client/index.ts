import {
  actionGeneric,
  type ArgsArrayForOptionalValidator,
  type ArgsArrayToObject,
  type DefaultArgsForOptionalValidator,
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

export type RunCommandOptions = {
  auth?: DaytonaAuth;
  command: string;
  create?: CreateSandboxOptions;
  createTimeout?: number;
  cwd?: string;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  sandboxId?: string;
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
  defaultCreate?: CreateSandboxOptions;
  deleteSandboxAfter?: boolean;
};

export type DaytonaActionRuntimeOptions = {
  auth?: DaytonaAuth;
  create?: Omit<CreateSandboxOptions, "language">;
  createTimeout?: number;
  deleteSandboxAfter?: boolean;
  deleteTimeout?: number;
  env?: Record<string, string>;
  sandboxId?: string;
  timeout?: number;
};

export type DaytonaActionContext = {
  env: Record<string, string | undefined>;
  require: (id: string) => unknown;
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
  returns?: ReturnsValidator;
  handler: (
    ...args: [...OneOrZeroArgs, DaytonaActionContext]
  ) => ReturnValue | Promise<ReturnValue>;
};

type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;

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
    } = {},
  ) {
    return await ctx.runAction(this.component.lib.createSandbox, {
      auth: this.auth(args.auth),
      create: mergeCreate(this.options.defaultCreate, args.create),
      createTimeout: args.createTimeout,
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
    return await ctx.runAction(this.component.lib.runCommand, {
      ...args,
      auth: this.auth(args.auth),
      create: mergeCreate(this.options.defaultCreate, args.create),
      deleteSandboxAfter:
        args.deleteSandboxAfter ?? this.options.deleteSandboxAfter,
    });
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
    return actionGeneric({
      args: definition.args as any,
      returns: definition.returns as any,
      handler: async (ctx, actionArgs: unknown = {}) => {
        const result = await this.runCode(ctx, {
          auth: definition.auth,
          argv: [],
          code: buildDaytonaActionCode(
            definition.handler as (...args: any[]) => unknown,
            actionArgs,
          ),
          create: {
            ...definition.create,
            language: "javascript",
          },
          createTimeout: definition.createTimeout,
          deleteSandboxAfter: definition.deleteSandboxAfter,
          deleteTimeout: definition.deleteTimeout,
          env: definition.env,
          language: "javascript",
          sandboxId: definition.sandboxId,
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
}

function buildDaytonaActionCode(
  handler: (...args: any[]) => unknown,
  args: unknown,
) {
  const source = handler.toString();
  const payload = base64EncodeUtf8(JSON.stringify({ args }));
  return `
(async () => {
  const __marker = ${JSON.stringify(DAYTONA_ACTION_RESULT_MARKER)};
  const __payload = JSON.parse(Buffer.from(${JSON.stringify(payload)}, "base64").toString("utf8"));
  const __serializeError = (error) => ({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
    stack: error instanceof Error ? error.stack : undefined,
  });

  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(process.cwd() + "/daytona-action.js");
    const __dirname = process.cwd();
    const __filename = __dirname + "/daytona-action.js";
    const __handler = (${source});
    const __value = await __handler(__payload.args, {
      env: process.env,
      require,
      __dirname,
      __filename,
    });
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
