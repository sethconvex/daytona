import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const create = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("jobs", {
      createdAt: now,
      output: "",
      status: "queued",
      updatedAt: now,
    });
  },
});

export const markRunning = internalMutation({
  args: { jobId: v.id("jobs"), sandboxId: v.string() },
  handler: async (ctx, { jobId, sandboxId }) => {
    const now = Date.now();
    await ctx.db.patch(jobId, {
      sandboxId,
      startedAt: now,
      status: "running",
      updatedAt: now,
    });
  },
});

export const complete = internalMutation({
  args: {
    exitCode: v.number(),
    jobId: v.id("jobs"),
    output: v.string(),
  },
  handler: async (ctx, { exitCode, jobId, output }) => {
    const job = await ctx.db.get(jobId);
    if (job?.status === "canceled") {
      await ctx.db.patch(jobId, {
        output,
        updatedAt: Date.now(),
      });
      return;
    }
    const now = Date.now();
    await ctx.db.patch(jobId, {
      completedAt: now,
      durationMs: job?.startedAt ? now - job.startedAt : undefined,
      exitCode,
      output,
      status: exitCode === 0 ? "succeeded" : "failed",
      updatedAt: now,
    });
  },
});

export const appendOutput = internalMutation({
  args: { content: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, { content, jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) {
      return;
    }
    await ctx.db.patch(jobId, {
      output: `${job.output}${content}`,
      updatedAt: Date.now(),
    });
  },
});

export const fail = internalMutation({
  args: { error: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, { error, jobId }) => {
    const job = await ctx.db.get(jobId);
    const now = Date.now();
    await ctx.db.patch(jobId, {
      completedAt: now,
      durationMs: job?.startedAt ? now - job.startedAt : undefined,
      error,
      status: "failed",
      updatedAt: now,
    });
  },
});

export const get = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

export const getInternal = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

export const cancel = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job || ["succeeded", "failed", "canceled"].includes(job.status)) {
      return;
    }
    await ctx.db.patch(jobId, {
      completedAt: Date.now(),
      status: "canceled",
      updatedAt: Date.now(),
    });
  },
});
