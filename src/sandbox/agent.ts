import { createTool } from "@convex-dev/agent";
import type { ToolCtx } from "@convex-dev/agent";
import { z } from "zod";
import type { Sandbox, SandboxInstance } from "./client.js";
import { SandboxError } from "./types.js";
const command = z.object({
  operation: z.literal("run"),
  command: z.array(z.string()).min(1),
  cwd: z.string().optional(),
  background: z.boolean().default(false),
});
const read = z.object({ operation: z.literal("read"), path: z.string() });
const write = z.object({
  operation: z.literal("write"),
  path: z.string(),
  contents: z.string().max(512 * 1024),
});
const inspect = z.object({
  operation: z.literal("inspect"),
  runId: z.string(),
});
const cancel = z.object({ operation: z.literal("cancel"), runId: z.string() });
const search = z.object({
  operation: z.literal("search"),
  pattern: z.string(),
  path: z.string().optional(),
});
const inputSchema = z.discriminatedUnion("operation", [
  command,
  read,
  write,
  inspect,
  cancel,
  search,
]);
type Input = z.infer<typeof inputSchema>;
export function sandboxTool(
  sandbox: Sandbox,
  options: { instance?: SandboxInstance; agentComponent?: string } = {},
) {
  return createTool({
    description:
      "Use an isolated persistent workspace for files and commands. Background commands return a run ID; inspect that ID for progress. Output is bounded; full logs remain at their outputPath. Workspace resets are explicitly reported.",
    inputSchema,
    execute: async (ctx: ToolCtx, input: Input, call) => {
      if (!options.instance && !ctx.threadId)
        throw new SandboxError(
          "VALIDATION",
          "Sandbox tools require an Agent thread or a bound workspace.",
        );
      const { instance, reset } = options.instance
        ? { instance: options.instance, reset: false }
        : await sandbox.forThread(ctx, ctx.threadId!, options.agentComponent);
      const token = crypto.randomUUID();
      // Cross-Action serialization belongs in the component, not a JS closure.
      while (
        !(await ctx.runMutation(sandbox.component.sandboxes.acquireTool!, {
          id: instance.id,
          token,
        }))
      )
        await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        let result: unknown;
        switch (input.operation) {
          case "run": {
            const job = {
              command: input.command,
              cwd: input.cwd,
              requestId: `tool:${instance.id}:${call.toolCallId}`,
            };
            const runId = await sandbox.start(
              ctx,
              job,
              instance.id,
              input.background ? undefined : token,
            );
            result = input.background
              ? { runId }
              : await sandbox.wait(ctx, runId);
            break;
          }
          case "read":
            result = await instance.files.read(ctx, {
              path: input.path,
              maxBytes: 32 * 1024,
            });
            break;
          case "write":
            result = await instance.files.write(ctx, {
              path: input.path,
              contents: input.contents,
            });
            break;
          case "search": {
            const runId = await sandbox.start(
              ctx,
              {
                command: [
                  "grep",
                  "-R",
                  "-n",
                  "--",
                  input.pattern,
                  input.path ?? "/workspace",
                ],
                timeout: "30s",
                requestId: `tool:${instance.id}:${call.toolCallId}`,
              },
              instance.id,
              token,
            );
            result = await sandbox.wait(ctx, runId);
            break;
          }
          case "inspect":
          case "cancel": {
            const run = await sandbox.runs.get(ctx, input.runId);
            if (!run || run.sandboxId !== instance.id)
              throw new SandboxError(
                "NOT_FOUND",
                "Run does not belong to this workspace.",
              );
            if (input.operation === "cancel")
              result = await sandbox.runs.cancel(ctx, input.runId);
            else
              result = {
                runId: input.runId,
                status: run.status,
                finalized: run.finalized,
                result: run.result,
                artifacts: run.artifacts,
              };
            break;
          }
        }
        return { sandboxId: instance.id, reset, result };
      } finally {
        await ctx.runMutation(sandbox.component.sandboxes.releaseTool!, {
          id: instance.id,
          token,
        });
      }
    },
  });
}
export function sandboxCodingTools(
  sandbox: Sandbox,
  options: { instance?: SandboxInstance; agentComponent?: string } = {},
) {
  const combined = sandboxTool(sandbox, options);
  // Separate schemas make each operation discoverable without changing the workspace.
  return Object.fromEntries(
    [command, read, write, inspect, cancel, search].map((schema) => [
      schema.shape.operation.value,
      { ...combined, inputSchema: schema },
    ]),
  );
}
