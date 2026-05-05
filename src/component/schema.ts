import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  callbackSecrets: defineTable({
    createdAt: v.number(),
    expiresAt: v.number(),
    secret: v.string(),
  }).index("by_secret", ["secret"]),
  jobs: defineTable({
    artifact: v.optional(
      v.object({
        contentType: v.string(),
        path: v.string(),
        size: v.number(),
        storageId: v.optional(v.string()),
        uploadUrl: v.optional(v.string()),
      }),
    ),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    exitCode: v.optional(v.number()),
    output: v.string(),
    sandboxId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    updatedAt: v.number(),
  }),
});
