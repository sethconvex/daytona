import { DaytonaRunner } from "@convex-dev/daytona";
import { anyApi, componentsGeneric } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const components = componentsGeneric();
const internalApi = anyApi as any;

const daytona = new DaytonaRunner(components.daytona as any, {
  defaultCreate: {
    autoStopInterval: 15,
    ephemeral: true,
    image: "node:22",
  },
});

export const analyzeText = daytona.defineAction({
  args: { text: v.string() },
  sandbox: { image: "node:22" },
  packages: ["lodash"],
  functions: {
    queries: { getFact: internalApi.facts.get },
    mutations: { seedFacts: internalApi.facts.seed },
  },
  handler: async (ctx, { text }) => {
    await ctx.mutations.seedFacts({});
    const fact = await ctx.queries.getFact<{ value: string }>({
      key: "demoContext",
    });
    await ctx.fs.writeFile("input.txt", text);
    const node = await ctx.exec("node --version");
    const lodash = ctx.require("lodash") as {
      startCase: (value: string) => string;
      words: (value: string) => string[];
    };
    const filePreview = await ctx.fs.readFile("input.txt", "utf8");

    return {
      commandOutput: node.stdout.trim(),
      dbContext: fact?.value ?? "No fact found.",
      filePreview: filePreview.slice(0, 120),
      installedPackageResult: lodash.startCase(text),
      length: text.length,
      wordCount: lodash.words(text).length,
    };
  },
});

export const startDurableJob = daytona.defineDurableAction({
  args: { label: v.string() },
  capture: { path: "artifacts" },
  output: {
    lineBuffered: true,
    redact: {
      patterns: ["dtn_[A-Za-z0-9_\\-]+"],
    },
  },
  packages: ["lodash"],
  sandbox: { image: "node:22" },
  timeout: 120,
  handler: async (ctx, { label }) => {
    const fs = ctx.require("node:fs") as typeof import("node:fs");
    const lodash = ctx.require("lodash") as {
      startCase: (value: string) => string;
    };

    fs.mkdirSync("artifacts", { recursive: true });
    console.log("starting " + lodash.startCase(label));
    for (let step = 1; step <= 30; step += 1) {
      console.log("step " + step + "/30");
      fs.appendFileSync(
        "artifacts/report.txt",
        "completed step " + step + " for " + label + "\n",
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("done");
  },
});

export const durableJob = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    return await daytona.getJob(ctx as any, { jobId });
  },
});

export const durableOutput = query({
  args: {
    afterSequence: v.optional(v.number()),
    jobId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await daytona.listJobOutput(ctx as any, args);
  },
});

export const cancelDurableJob = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    await daytona.cancelJob(ctx as any, { jobId });
  },
});
