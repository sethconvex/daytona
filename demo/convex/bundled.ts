import { RemoteRunner } from "@convex-dev/sandbox";
import { componentsGeneric } from "convex/server";
import { v } from "convex/values";
import { bundles } from "./remote/_generated/manifest.js";

const components = componentsGeneric();
const remote = new RemoteRunner(components.sandbox as any);

export const getStringLength = remote.defineBundledAction({
  args: { text: v.string() },
  bundle: bundles.getStringLength,
  sandbox: { image: "node:22" },
});
