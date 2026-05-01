import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("facts")
      .withIndex("by_key", (q) => q.eq("key", "demoContext"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: "This string came from Convex DB via ctx.runQuery.",
      });
      return;
    }
    await ctx.db.insert("facts", {
      key: "demoContext",
      value: "This string came from Convex DB via ctx.runQuery.",
    });
  },
});

export const get = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("facts")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  },
});

export const saveRun = internalMutation({
  args: { value: v.string() },
  handler: async (ctx, { value }) => {
    await ctx.db.insert("facts", {
      key: "lastRun",
      value,
    });
  },
});
