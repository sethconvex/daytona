import { mutation } from "../../src/component/_generated/server.js";
import { v } from "convex/values";
const args = { id: v.string(), context: v.any(), result: v.any() };
export const success = mutation({
  args,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("callbackSecrets", {
      secret: `success:${args.id}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
    });
    if (args.context?.throwSuccess)
      throw new Error("Deliberate success callback failure");
    return null;
  },
});
export const failure = mutation({
  args,
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("callbackSecrets", {
      secret: `failure:${args.id}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000,
    });
    if (args.context?.throwFailure)
      throw new Error("Deliberate failure callback failure");
    return null;
  },
});
