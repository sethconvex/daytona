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

export const greet = daytona.defineAction({
  args: {
    name: v.string(),
  },
  returns: v.object({
    greeting: v.string(),
    node: v.string(),
    pwd: v.string(),
  }),
  timeout: 30,
  handler: async (ctx, { name }) => {
    const os = await import("node:os");
    const pwd = await ctx.exec("pwd");
    return {
      greeting: `hello ${name} from Daytona`,
      node: `${process.version} on ${os.platform()}`,
      pwd: pwd.stdout.trim(),
    };
  },
});

export const runShell = action({
  args: {},
  handler: async (ctx) => {
    return await daytona.runCommand(ctx, {
      command: "node hello.js && uname -a",
      sandbox: {
        files: [
          {
            path: "hello.js",
            content: "console.log('hello from a staged file')",
          },
        ],
      },
      timeout: 30,
    });
  },
});
