import { DaytonaRunner } from "@convex-dev/daytona";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { action } from "./_generated/server.js";

const daytona = new DaytonaRunner(components.daytona, {
  defaultCreate: {
    autoStopInterval: 15,
    ephemeral: true,
    language: "typescript",
  },
});

export const runTypeScript = action({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await daytona.runAction(ctx, {
      kind: "code",
      code: `console.log("hello ${args.name} from Daytona")`,
      language: "typescript",
      timeout: 30,
    });
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
