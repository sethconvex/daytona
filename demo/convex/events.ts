import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const commandOutput = internalMutation({
  args: {
    content: v.string(),
    runId: v.string(),
    sandboxId: v.string(),
    sequence: v.number(),
    stream: v.union(v.literal("stdout"), v.literal("stderr")),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("outputEvents", args);
  },
});

export const artifactReady = internalMutation({
  args: {
    contentType: v.string(),
    path: v.string(),
    size: v.number(),
    storageId: v.optional(v.string()),
    uploadUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("artifacts", args);
  },
});

export const recentOutputEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("outputEvents")
      .withIndex("by_time")
      .order("desc")
      .take(40);
  },
});

export const artifacts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("artifacts").order("desc").take(10);
  },
});
