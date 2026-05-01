# Convex Daytona Component

Run Convex action work in Daytona sandboxes when the default Convex runtime or `"use node"` is not the right execution environment.

This component gives your app Convex actions a small Daytona runtime bridge:

- create or reuse Daytona sandboxes
- run shell commands
- run Python, TypeScript, or JavaScript snippets with Daytona's code runner
- keep Daytona credentials in your app environment instead of the component environment

The Convex action still orchestrates the call, but the actual code or command runs inside Daytona.

## Installation

```sh
npm install @convex-dev/daytona
```

Install the component in `convex/convex.config.ts`:

```ts
import daytona from "@convex-dev/daytona/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(daytona);

export default app;
```

Set Daytona credentials on your Convex deployment:

```sh
npx convex env set DAYTONA_API_KEY your_key
```

You can also use `DAYTONA_JWT_TOKEN` with `DAYTONA_ORGANIZATION_ID`, plus optional `DAYTONA_API_URL` and `DAYTONA_TARGET`.

## Usage

The easiest API is `daytona.defineAction`. You define a regular Convex action,
but the handler function runs as JavaScript in a Node process inside a Daytona
sandbox.

```ts
import { DaytonaRunner } from "@convex-dev/daytona";
import { v } from "convex/values";
import { components } from "./_generated/api.js";

const daytona = new DaytonaRunner(components.daytona, {
  defaultCreate: {
    ephemeral: true,
    language: "javascript",
    autoStopInterval: 15,
  },
});

export const analyzeRepo = daytona.defineAction({
  args: { name: v.string() },
  returns: v.object({
    greeting: v.string(),
    node: v.string(),
    files: v.array(v.string()),
  }),
  sandbox: { image: "node:22" },
  packages: ["yaml"],
  timeout: 30,
  handler: async (ctx, { name }) => {
    const os = await import("node:os");
    await ctx.fs.writeFile("hello.txt", `hello ${name}`);
    const listing = await ctx.exec("ls -1");
    return {
      greeting: `hello ${name} from Daytona`,
      node: `${process.version} on ${os.platform()}`,
      files: listing.stdout.trim().split("\n"),
    };
  },
});
```

Inside a `daytona.defineAction` handler you can use Node globals, `fetch`,
dynamic `import(...)`, `require(...)`, `ctx.fs`, and `ctx.exec(...)`. The
handler is serialized and executed in Daytona, so keep it self-contained: do
not close over app variables or imported helpers. Pass data through `args`,
`env`, `functions`, staged `files`, or a reused sandbox instead.

Packages are explicit. Pass `packages: ["octokit"]` for the common npm path, or
`install: { manager: "pnpm", packages: ["octokit"] }` /
`install: { command: "npm ci" }` when you want control.

## Calling Back Into Convex

To use `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` from Daytona,
mount the callback bridge once in `convex/http.ts`:

```ts
import { daytonaCallback } from "@convex-dev/daytona";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";

const http = httpRouter();

http.route({
  path: "/daytona/callback",
  method: "POST",
  handler: httpAction(daytonaCallback()),
});

export default http;
```

Set a shared secret:

```sh
npx convex env set DAYTONA_CALLBACK_SECRET your_random_secret
```

The action helper defaults the callback URL to
`${CONVEX_SITE_URL}/daytona/callback`. You can also pass `callbackUrl` and
`callbackSecret` to `new DaytonaRunner(...)`, or set `DAYTONA_CALLBACK_URL`.

Register the functions this Daytona action is allowed to call, then call them
by name from the Daytona-side `ctx`:

```ts
import { DaytonaRunner } from "@convex-dev/daytona";
import { v } from "convex/values";
import { components, internal } from "./_generated/api.js";

const daytona = new DaytonaRunner(components.daytona);

export const enrichUser = daytona.defineAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  functions: {
    queries: {
      getUser: internal.users.get,
    },
    mutations: {
      saveProfile: internal.users.saveProfile,
    },
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.runQuery<{ email: string }>("getUser", { userId });
    const profile = await fetch(`https://example.com/profile/${user.email}`);
    await ctx.runMutation("saveProfile", {
      userId,
      profile: await profile.json(),
    });
    return null;
  },
});
```

## Commands

Use `runCommand` when you want a command-shaped primitive. It accepts one
spec with sandbox input, output callbacks, capture, and callback auth in predictable
places:

```ts
const result = await daytona.runCommand(ctx, {
  command: "npm test",
  timeout: 30,
  sandbox: {
    create: { image: "node:22", autoStopInterval: 30 },
    files: [
      {
        path: "package.json",
        content: JSON.stringify({ scripts: { test: "node test.js" } }),
      },
      {
        path: "test.js",
        content: "console.log('ok')",
      },
    ],
  },
  install: { packages: ["typescript"] },
  output: {
    // Pass a normal Convex function reference. The client turns it into a
    // function handle for the component.
    onOutput: internal.events.commandOutput,
  },
  capture: {
    path: "coverage",
    uploadUrl,
    onArtifact: internal.events.artifactReady,
  },
  callback: {
    secret: "mint",
  },
});
```

The command result includes:

```ts
result.durationMs;
result.result.exitCode;
result.result.result; // stdout
result.result.stderr;
result.artifact; // when capture is set
result.callbackSecret; // when callback.secret is "mint"
```

The output mutation receives:

```ts
{
  runId: string,
  sandboxId: string,
  sequence: number,
  stream: "stdout" | "stderr",
  content: string,
  timestamp: number,
}
```

The artifact mutation receives:

```ts
{
  path: string,
  contentType: "application/gzip",
  size: number,
  uploadUrl?: string,
  storageId?: string,
}
```

`seedDownloadUrl` is treated as a `tar.gz` archive and extracted before files
are staged. `capture.uploadUrl` is a consumer-provided upload URL; generate it
from your app when you want the archive in your own storage namespace.

## Durable Jobs

Use `startCommand` when a command should keep running after the calling action
returns. The component stores status and accumulated output in its own table.

```ts
export const startTests = action({
  args: {},
  handler: async (ctx) => {
    return await daytona.startCommand(ctx, {
      command: "npm test",
      sandbox: { create: { image: "node:22" } },
      files,
      install: { command: "npm ci" },
      output: { onOutput: internal.events.commandOutput },
      capture: { path: "coverage", uploadUrl },
    });
  },
});

export const testStatus = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    return await daytona.getJob(ctx, { jobId });
  },
});

export const cancelTests = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    await daytona.cancelJob(ctx, { jobId });
  },
});
```

Canceling a queued job prevents it from starting. Canceling a running job marks
it canceled and preserves that state; use a short Daytona timeout or delete the
sandbox from your app if you need hard process termination.

You can still use the small forms:

```ts
const sandbox = await daytona.createSandbox(ctx, {
  create: { language: "python", autoStopInterval: 30 },
  files: [{ path: "hello.py", content: "print('hi')" }],
});

await daytona.runCode(ctx, {
  sandboxId: sandbox.id,
  language: "python",
  code: "print('kept warm')",
  deleteSandboxAfter: false,
});
```

By default, a sandbox created for a single `runCommand` or `runCode` call is deleted after the run. Pass `sandboxId` to reuse an existing sandbox, or set `deleteSandboxAfter: false`.

## Direct Component API

You can call the component functions directly from a Convex action:

```ts
await ctx.runAction(components.daytona.lib.runCommand, {
  auth: { apiKey: process.env.DAYTONA_API_KEY },
  command: "echo hello",
});
```

The direct API requires `auth` because Convex components do not inherit the app's environment variables.
