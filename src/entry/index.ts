import type {
  FunctionReference,
  FunctionReturnType,
  FunctionType,
  FunctionVisibility,
  OptionalRestArgs,
} from "convex/server";
import type { RemoteExecResult } from "../client/index.js";

type AnyConvexFunction<
  Type extends FunctionType = FunctionType,
> = FunctionReference<Type, FunctionVisibility, any, any>;

type RemoteFunctionMap<Type extends FunctionType> = Record<
  string,
  AnyConvexFunction<Type>
>;

type RemoteCallableMap<Functions extends RemoteFunctionMap<FunctionType>> = {
  [Name in keyof Functions]: (
    ...args: OptionalRestArgs<Functions[Name]>
  ) => Promise<Awaited<FunctionReturnType<Functions[Name]>>>;
};

type DefinedMap<Map> = Map extends RemoteFunctionMap<FunctionType> ? Map : {};

type FunctionAt<Map, Name extends string> = Map extends Record<Name, infer Ref>
  ? Ref extends AnyConvexFunction
    ? Ref
    : never
  : never;

export type RemoteHandlerSpec = {
  actions?: RemoteFunctionMap<"action">;
  args?: Record<string, unknown>;
  mutations?: RemoteFunctionMap<"mutation">;
  queries?: RemoteFunctionMap<"query">;
  returns?: unknown;
};

export type RemoteHandlerContext<Spec extends RemoteHandlerSpec> = {
  actions: RemoteCallableMap<DefinedMap<Spec["actions"]>>;
  exec: (
    command: string,
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      timeoutMs?: number;
    },
  ) => Promise<RemoteExecResult>;
  fs: typeof import("node:fs/promises");
  runAction: <Name extends keyof DefinedMap<Spec["actions"]> & string>(
    name: Name,
    ...args: OptionalRestArgs<FunctionAt<DefinedMap<Spec["actions"]>, Name>>
  ) => Promise<Awaited<FunctionReturnType<FunctionAt<DefinedMap<Spec["actions"]>, Name>>>>;
  runMutation: <Name extends keyof DefinedMap<Spec["mutations"]> & string>(
    name: Name,
    ...args: OptionalRestArgs<FunctionAt<DefinedMap<Spec["mutations"]>, Name>>
  ) => Promise<
    Awaited<FunctionReturnType<FunctionAt<DefinedMap<Spec["mutations"]>, Name>>>
  >;
  runQuery: <Name extends keyof DefinedMap<Spec["queries"]> & string>(
    name: Name,
    ...args: OptionalRestArgs<FunctionAt<DefinedMap<Spec["queries"]>, Name>>
  ) => Promise<Awaited<FunctionReturnType<FunctionAt<DefinedMap<Spec["queries"]>, Name>>>>;
  env: Record<string, string | undefined>;
  require: (id: string) => unknown;
  mutations: RemoteCallableMap<DefinedMap<Spec["mutations"]>>;
  queries: RemoteCallableMap<DefinedMap<Spec["queries"]>>;
  __dirname: string;
  __filename: string;
};

export type RemoteHandlerArgs<Spec extends RemoteHandlerSpec> =
  Spec["args"] extends Record<string, unknown> ? Spec["args"] : Record<string, never>;

export type RemoteHandlerReturn<Spec extends RemoteHandlerSpec> =
  Spec["returns"] extends undefined ? unknown : Spec["returns"];

export type RemoteHandler<Spec extends RemoteHandlerSpec> = (
  ctx: RemoteHandlerContext<Spec>,
  args: RemoteHandlerArgs<Spec>,
) => RemoteHandlerReturn<Spec> | Promise<RemoteHandlerReturn<Spec>>;

export function defineRemoteHandler<Spec extends RemoteHandlerSpec>(
  handler: RemoteHandler<Spec>,
) {
  return handler;
}

export type InferRemoteHandlerArgs<Handler> =
  Handler extends RemoteHandler<infer Spec> ? RemoteHandlerArgs<Spec> : never;

export type InferRemoteHandlerReturn<Handler> =
  Handler extends RemoteHandler<infer Spec> ? RemoteHandlerReturn<Spec> : never;

export type RemoteFunctionReferences<Spec extends RemoteHandlerSpec> = {
  actions?: Spec["actions"];
  mutations?: Spec["mutations"];
  queries?: Spec["queries"];
};

export type RemoteBundle<
  Args extends Record<string, unknown> = Record<string, unknown>,
  Returns = unknown,
> = {
  entrypoint: string;
  files: Array<{
    content: string;
    encoding?: "base64" | "utf8";
    mode?: string;
    path: string;
  }>;
  functions?: RemoteFunctionReferences<RemoteHandlerSpec>;
  name: string;
  packages?: string[];
  source?: string;
  types?: {
    args: Args;
    returns: Returns;
  };
};

export type RemoteBundleManifest = Record<string, RemoteBundle<any, any>>;

export type DaytonaHandlerSpec = RemoteHandlerSpec;
export type DaytonaHandlerContext<Spec extends RemoteHandlerSpec> =
  RemoteHandlerContext<Spec>;
export type DaytonaHandlerArgs<Spec extends RemoteHandlerSpec> =
  RemoteHandlerArgs<Spec>;
export type DaytonaHandlerReturn<Spec extends RemoteHandlerSpec> =
  RemoteHandlerReturn<Spec>;
export type DaytonaHandler<Spec extends RemoteHandlerSpec> = RemoteHandler<Spec>;
export type DaytonaFunctionReferences<Spec extends RemoteHandlerSpec> =
  RemoteFunctionReferences<Spec>;
export type DaytonaBundle<
  Args extends Record<string, unknown> = Record<string, unknown>,
  Returns = unknown,
> = RemoteBundle<Args, Returns>;
export type DaytonaBundleManifest = RemoteBundleManifest;
export const defineDaytonaHandler = defineRemoteHandler;
