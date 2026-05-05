import { DaytonaRunner } from "@convex-dev/daytona";
import { anyApi, componentsGeneric } from "convex/server";
import { v } from "convex/values";
import { action } from "./_generated/server.js";
import { bundles } from "./daytonaManifest.js";

const internalApi = anyApi as any;
const components = componentsGeneric();
const daytona = new DaytonaRunner(components.daytona as any);

export const seedBundledDemo = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internalApi.facts.seed, {});
    return null;
  },
});

export const getStringLength = daytona.defineBundledAction({
  args: { text: v.string() },
  bundle: bundles.getStringLength,
  sandbox: { image: "node:22" },
  functions: {
    queries: {
      getFact: internalApi.facts.get,
    },
  },
});
