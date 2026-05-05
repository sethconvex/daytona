import { DaytonaRunner } from "@convex-dev/daytona";
import { componentsGeneric } from "convex/server";
import { v } from "convex/values";
import { bundles } from "./daytonaManifest.js";

const components = componentsGeneric();
const daytona = new DaytonaRunner(components.daytona as any);

export const getStringLength = daytona.defineBundledAction({
  args: { text: v.string() },
  bundle: bundles.getStringLength,
  sandbox: { image: "node:22" },
});
