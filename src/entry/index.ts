import type {
  FunctionReference,
  FunctionReturnType,
  FunctionType,
  FunctionVisibility,
  OptionalRestArgs,
} from "convex/server";
import type { DaytonaExecResult } from "../client/index.js";

type AnyConvexFunction<
  Type extends FunctionType = FunctionType,
> = FunctionReference<Type, FunctionVisibility, any, any>;

type DaytonaFunctionMap<Type extends FunctionType> = Record<
  string,
  AnyConvexFunction<Type>
>;

type DaytonaCallableMap<Functions extends DaytonaFunctionMap<FunctionType>> = {
  [Name in keyof Functions]: (
    ...args: OptionalRestArgs<Functions[Name]>
  ) => Promise<Awaited<FunctionReturnType<Functions[Name]>>>;
};

type DefinedMap<Map> = Map extends DaytonaFunctionMap<FunctionType> ? Map : {};

type FunctionAt<Map, Name extends string> = Map extends Record<Name, infer Ref>
  ? Ref extends AnyConvexFunction
    ? Ref
    : never
  : never;

export type DaytonaHandlerSpec = {
  actions?: DaytonaFunctionMap<"action">;
  args?: Record<string, unknown>;
  mutations?: DaytonaFunctionMap<"mutation">;
  queries?: DaytonaFunctionMap<"query">;
  returns?: unknown;
};

export type DaytonaHandlerContext<Spec extends DaytonaHandlerSpec> = {
  actions: DaytonaCallableMap<DefinedMap<Spec["actions"]>>;
  exec: (
    command: string,
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      timeoutMs?: number;
    },
  ) => Promise<DaytonaExecResult>;
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
  mutations: DaytonaCallableMap<DefinedMap<Spec["mutations"]>>;
  queries: DaytonaCallableMap<DefinedMap<Spec["queries"]>>;
  __dirname: string;
  __filename: string;
};

export type DaytonaHandlerArgs<Spec extends DaytonaHandlerSpec> =
  Spec["args"] extends Record<string, unknown> ? Spec["args"] : Record<string, never>;

export type DaytonaHandlerReturn<Spec extends DaytonaHandlerSpec> =
  Spec["returns"] extends undefined ? unknown : Spec["returns"];

export type DaytonaHandler<Spec extends DaytonaHandlerSpec> = (
  ctx: DaytonaHandlerContext<Spec>,
  args: DaytonaHandlerArgs<Spec>,
) => DaytonaHandlerReturn<Spec> | Promise<DaytonaHandlerReturn<Spec>>;

export function defineDaytonaHandler<Spec extends DaytonaHandlerSpec>(
  handler: DaytonaHandler<Spec>,
) {
  return handler;
}

export type InferDaytonaHandlerArgs<Handler> =
  Handler extends DaytonaHandler<infer Spec> ? DaytonaHandlerArgs<Spec> : never;

export type InferDaytonaHandlerReturn<Handler> =
  Handler extends DaytonaHandler<infer Spec> ? DaytonaHandlerReturn<Spec> : never;

export type DaytonaFunctionReferences<Spec extends DaytonaHandlerSpec> = {
  actions?: Spec["actions"];
  mutations?: Spec["mutations"];
  queries?: Spec["queries"];
};

export type DaytonaBundle<
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
  functions?: DaytonaFunctionReferences<DaytonaHandlerSpec>;
  name: string;
  packages?: string[];
  source?: string;
  types?: {
    args: Args;
    returns: Returns;
  };
};

export type DaytonaBundleManifest = Record<string, DaytonaBundle<any, any>>;
