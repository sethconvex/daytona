import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  sandboxState,
  runStatus,
  resultValidator,
} from "./sandboxValidators.js";

export default defineSchema({
  workspaces: defineTable({
    config: v.string(),
    state: sandboxState,
    expiresAt: v.number(),
    agentRunId: v.optional(v.id("runs")),
    threadKey: v.optional(v.string()),
    toolToken: v.optional(v.string()),
    toolLeaseUntil: v.optional(v.number()),
  }).index("by_threadKey", ["threadKey"]),
  runs: defineTable({
    sandboxId: v.id("workspaces"),
    job: v.string(),
    requestId: v.string(),
    fingerprint: v.string(),
    temporary: v.boolean(),
    status: runStatus,
    cancelRequested: v.boolean(),
    finalized: v.boolean(),
    leaseUntil: v.optional(v.number()),
    leaseToken: v.optional(v.string()),
    result: v.optional(resultValidator),
    error: v.optional(v.string()),
    taskCallbacks: v.optional(
      v.object({
        onSuccess: v.string(),
        onFailure: v.string(),
        context: v.any(),
      }),
    ),
    delivery: v.optional(
      v.union(
        v.literal("delivering"),
        v.literal("succeeded"),
        v.literal("failureScheduled"),
        v.literal("failed"),
      ),
    ),
    failureScheduledId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_requestId", ["requestId"])
    .index("by_sandboxId_status", ["sandboxId", "status"]),
  artifacts: defineTable({
    runId: v.id("runs"),
    path: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    preview: v.string(),
    expiresAt: v.number(),
  })
    .index("by_runId_path", ["runId", "path"])
    .index("by_expiresAt", ["expiresAt"]),
  callbackSecrets: defineTable({
    capabilities: v.optional(v.array(v.string())),
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
  jobOutputs: defineTable({
    content: v.string(),
    createdAt: v.number(),
    jobId: v.id("jobs"),
    runId: v.string(),
    sandboxId: v.string(),
    sequence: v.number(),
    stream: v.union(v.literal("stdout"), v.literal("stderr")),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_job_sequence", ["jobId", "sequence"]),
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
    outputCursor: v.optional(v.union(v.string(), v.null())),
    outputDeleted: v.number(),
    outputOlderThan: v.optional(v.number()),
    processed: v.number(),
    status: v.union(
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
    ),
    updatedAt: v.number(),
  }).index("by_status_updatedAt", ["status", "updatedAt"]),
});
