import { DaytonaRunner } from "@convex-dev/daytona";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { action } from "./_generated/server.js";

const daytona = new DaytonaRunner(components.daytona, {
  defaultCreate: {
    autoStopInterval: 15,
    ephemeral: true,
    language: "javascript",
  },
});

export const greet = daytona.action({
  args: {
    name: v.string(),
  },
  returns: v.object({
    greeting: v.string(),
    node: v.string(),
  }),
  timeout: 30,
  handler: async (_ctx, { name }) => {
    const os = await import("node:os");
    return {
      greeting: `hello ${name} from Daytona`,
      node: `${process.version} on ${os.platform()}`,
    };
  },
});

export const runShell = action({
  args: {},
  handler: async (ctx) => {
    return await daytona.runCommand(ctx, {
      command: "uname -a && pwd",
      timeout: 30,
    });
  },
});
