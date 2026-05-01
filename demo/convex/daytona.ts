"use node";

import { Daytona } from "@daytona/sdk";
import { anyApi } from "convex/server";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";

const internalApi = (anyApi as any);

export const analyzeText = action({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    await ctx.runMutation(internalApi.facts.seed, {});
    const fact = await ctx.runQuery(internalApi.facts.get, {
      key: "demoContext",
    });
    const sandbox = await createSandbox();
    try {
      await sandbox.fs.uploadFiles([
        {
          destination: "package.json",
          source: Buffer.from(JSON.stringify({ dependencies: { lodash: "latest" } })),
        },
        {
          destination: "analyze.js",
          source: Buffer.from(`
const fs = require("node:fs");
const lodash = require("lodash");
const text = ${JSON.stringify(text)};
const dbContext = ${JSON.stringify(fact?.value ?? "No fact found.")};
fs.writeFileSync("input.txt", text);
console.log(JSON.stringify({
  commandOutput: process.version,
  dbContext,
  filePreview: fs.readFileSync("input.txt", "utf8").slice(0, 120),
  installedPackageResult: lodash.startCase(text),
  length: text.length,
  wordCount: lodash.words(text).length,
}));
`),
        },
      ]);
      await sandbox.process.executeCommand("npm install", undefined, undefined, 120);
      const result = await sandbox.process.executeCommand("node analyze.js");
      return JSON.parse(result.result.trim());
    } finally {
      await deleteSandbox(sandbox).catch(() => undefined);
    }
  },
});

export const startDurableJob = action({
  args: { label: v.string() },
  handler: async (ctx, { label }) => {
    const jobId = await ctx.runMutation(internalApi.jobs.create, {});
    await ctx.scheduler.runAfter(0, internalApi.daytona.runDurableJob, {
      jobId,
      payload: { label },
    });
    return { jobId };
  },
});

export const runDurableJob = defineDurableNodeAction({
  packages: ["lodash"],
  handler: async (ctx, { label }: { label: string }) => {
    const fs = ctx.require("node:fs") as typeof import("node:fs");
    const lodash = ctx.require("lodash") as { startCase(value: string): string };
    fs.mkdirSync("artifacts", { recursive: true });
    let output = "starting " + lodash.startCase(label) + "\n";
    for (let i = 1; i <= 30; i += 1) {
      output += "step " + i + "/30\n";
      fs.appendFileSync("artifacts/report.txt", "completed step " + i + "\n");
    }
    output += "done\n";
    console.log(output);
  },
});

function defineDurableNodeAction({
  handler,
  packages,
}: {
  handler: (ctx: { require: NodeRequire }, payload: any) => Promise<void> | void;
  packages?: string[];
}) {
  return internalAction({
    args: { jobId: v.id("jobs"), payload: v.any() },
    handler: async (ctx, { jobId, payload }) => {
    const sandbox = await createSandbox();
    await ctx.runMutation(internalApi.jobs.markRunning, {
      jobId,
      sandboxId: sandbox.id,
    });
    try {
      await sandbox.fs.uploadFiles([
        {
          destination: "package.json",
          source: Buffer.from(
            JSON.stringify({
              dependencies: Object.fromEntries(
                (packages ?? []).map((pkg) => [pkg, "latest"]),
              ),
            }),
          ),
        },
        {
          destination: "job.js",
          source: Buffer.from(buildDurableScript(handler, payload)),
        },
      ]);
      const install = await sandbox.process.executeCommand(
        "npm install",
        undefined,
        undefined,
        120,
      );
      let output = `$ npm install\n${install.result}\n$ node job.js\n`;
      await ctx.runMutation(internalApi.jobs.appendOutput, {
        content: output,
        jobId,
      });
      let exitCode = 0;
      for (let step = 1; step <= 30; step += 1) {
        const current = await ctx.runMutation(internalApi.jobs.getInternal, {
          jobId,
        });
        if (current?.status === "canceled") {
          const line = "canceled by user\n";
          output += line;
          await ctx.runMutation(internalApi.jobs.appendOutput, {
            content: line,
            jobId,
          });
          exitCode = 130;
          break;
        }
        const run = await sandbox.process.executeCommand(
          `node job.js ${step}`,
          undefined,
          undefined,
          30,
        );
        output += run.result;
        await ctx.runMutation(internalApi.jobs.appendOutput, {
          content: run.result,
          jobId,
        });
        exitCode = run.exitCode;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await ctx.runMutation(internalApi.jobs.complete, {
        exitCode,
        jobId,
        output,
      });
      await ctx.runMutation(internalApi.events.artifactReady, {
        contentType: "text/plain",
        path: "artifacts/report.txt",
        size: output.length,
      });
    } catch (error) {
      await ctx.runMutation(internalApi.jobs.fail, {
        error: error instanceof Error ? error.message : String(error),
        jobId,
      });
    } finally {
      await deleteSandbox(sandbox).catch(() => undefined);
    }
    },
  });
}

function createSandbox() {
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
    target: process.env.DAYTONA_TARGET,
  });
  return daytona.create({
    autoStopInterval: 15,
    ephemeral: true,
    image: "node:22",
    language: "javascript",
  });
}

async function deleteSandbox(sandbox: Awaited<ReturnType<typeof createSandbox>>) {
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
    target: process.env.DAYTONA_TARGET,
  });
  await daytona.delete(sandbox);
}

function buildDurableScript(handler: Function, payload: unknown) {
  return `
(async () => {
  const fs = require("node:fs");
  const lodash = require("lodash");
  fs.mkdirSync("artifacts", { recursive: true });
  const step = Number(process.argv[2] ?? "1");
  const label = ${JSON.stringify((payload as { label?: string }).label ?? "demo")};
  console.log("step " + step + "/30 for " + lodash.startCase(label));
  fs.appendFileSync("artifacts/report.txt", "completed step " + step + "\\n");
})();
`;
}
