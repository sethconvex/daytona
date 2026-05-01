import type {
  GenericActionCtx,
  GenericDataModel,
} from "convex/server";
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

type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runAction">;

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
