import { v } from "convex/values";
export const serviceValidator = v.object({
  url: v.string(),
  token: v.string(),
});
export const sandboxState = v.union(
  v.literal("pending"),
  v.literal("ready"),
  v.literal("suspended"),
  v.literal("destroyed"),
  v.literal("expired"),
);
export const runStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("exited"),
  v.literal("timedOut"),
  v.literal("cancelled"),
  v.literal("failed"),
);
export const output = v.object({
  text: v.string(),
  truncated: v.boolean(),
  outputPath: v.optional(v.string()),
  artifactId: v.optional(v.string()),
});
export const resultValidator = v.object({
  status: runStatus,
  exitCode: v.union(v.number(), v.null()),
  durationMs: v.number(),
  stdout: output,
  stderr: output,
  error: v.optional(v.string()),
});
