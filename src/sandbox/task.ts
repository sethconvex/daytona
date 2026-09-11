import {
  createFunctionHandle,
  type FunctionHandle,
  type FunctionReference,
  type GenericActionCtx,
  type GenericDataModel,
} from "convex/server";
import type { Value } from "convex/values";
export type Task<Config extends Record<string, Value> = Record<string, Value>> =
  {
    name: string;
    start: FunctionHandle<"mutation", StartArgs<Config>, StartReturns>;
    config: Config;
    taskStack?: Task[];
  };
export type StartArgs<
  Config extends Record<string, Value> = Record<string, Value>,
> = {
  name: string;
  config: Config;
  taskStack?: Task[];
  onSuccess: FunctionHandle<"mutation">;
  onFailure: FunctionHandle<"mutation">;
  context: Value;
};
export type StartReturns = {
  id: string;
  cancel: FunctionHandle<"mutation", { id: string }, null>;
};
export async function startTask(
  ctx: Pick<GenericActionCtx<GenericDataModel>, "runMutation">,
  input: Task | Promise<Task>,
  callbacks: {
    onSuccess: FunctionReference<"mutation", any, any, null>;
    onFailure: FunctionReference<"mutation", any, any, null>;
    context?: Value;
  },
): Promise<StartReturns> {
  const task = await input;
  return ctx.runMutation(task.start, {
    name: task.name,
    config: task.config,
    ...(task.taskStack ? { taskStack: task.taskStack } : {}),
    onSuccess: await createFunctionHandle(callbacks.onSuccess),
    onFailure: await createFunctionHandle(callbacks.onFailure),
    context: callbacks.context ?? null,
  });
}

export type OnSuccessArgs<Context = unknown, Returns = unknown> = {
  id: string;
  context: Context;
  result: { kind: "success"; returnValue: Returns };
};
export type OnFailureArgs<Context = unknown> = {
  id: string;
  context: Context;
  result: { kind: "failed"; error: string } | { kind: "canceled" };
};
