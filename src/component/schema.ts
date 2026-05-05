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
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_sandboxId", ["sandboxId"]),
  cleanupRuns: defineTable({
    batchSize: v.number(),
    cancelCursor: v.optional(v.union(v.string(), v.null())),
    cancelOlderThan: v.optional(v.number()),
    canceled: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    deleteCursor: v.optional(v.union(v.string(), v.null())),
    deleteOlderThan: v.optional(v.number()),
    deleted: v.number(),
    error: v.optional(v.string()),
    processed: v.number(),
    status: v.union(
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    updatedAt: v.number(),
  }).index("by_status_updatedAt", ["status", "updatedAt"]),
});
