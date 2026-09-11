import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import { Sandbox, startTask } from "@convex-dev/sandbox";
import { v } from "convex/values";
const sandbox = new Sandbox(components.sandbox, {
  defaults: { resources: "small" },
});
export const start = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) =>
    sandbox.start(ctx, {
      command: [
        "python3",
        "-c",
        "print('sandbox smoke');open('report.txt','w').write('artifact survived cleanup')",
      ],
      outputs: ["/workspace/report.txt"],
      requestId: "sandbox-smoke-v1",
    }),
});
export const status = internalQuery({
  args: { runId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => sandbox.runs.get(ctx, args.runId),
});
export const artifact = internalAction({
  args: { id: v.string() },
  returns: v.string(),
  handler: (ctx, args) => sandbox.artifacts.readText(ctx, args.id as any),
});

export const succeeded = internalMutation({
  args: { id: v.string(), context: v.any(), result: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("facts", {
      key: `task:${args.id}`,
      value: JSON.stringify(args.result),
    });
    return null;
  },
});
export const failed = internalMutation({
  args: { id: v.string(), context: v.any(), result: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("facts", {
      key: `task:${args.id}`,
      value: JSON.stringify(args.result),
    });
    return null;
  },
});
export const task = internalMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const handle = await startTask(
      ctx,
      sandbox.task({ command: ["python3", "-c", "raise SystemExit(7)"] }),
      {
        onSuccess: internal.sandboxSmoke.succeeded,
        onFailure: internal.sandboxSmoke.failed,
        context: { source: "smoke" },
      },
    );
    return handle.id;
  },
});
export const taskResult = internalQuery({
  args: { runId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) =>
    ctx.db
      .query("facts")
      .withIndex("by_key", (q) => q.eq("key", `task:${args.runId}`))
      .unique(),
});
