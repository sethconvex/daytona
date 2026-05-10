# Convex Remote Runner Component

Run Convex action work in remote sandboxes when the default Convex runtime or `"use node"` is not the right execution environment.

This component gives your app Convex actions a small sandbox runtime bridge:

- create or reuse remote sandboxes, or use Fly Sprites as a drop-in provider
- run shell commands
- run Python, TypeScript, or JavaScript snippets
- keep provider credentials in your app environment instead of the component environment

The Convex action still orchestrates the call, but the actual code or command
runs inside the sandbox. The component talks to providers over `fetch`, so it
can run in the standard Convex component runtime without provider Node SDKs.

## Installation

```sh
npm install @convex-dev/remote-runner
```

Install the component in `convex/convex.config.ts`:

```ts
import remoteRunner from "@convex-dev/remote-runner/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(remoteRunner, { httpPrefix: "/remote-runner/" });

export default app;
```

Set provider credentials on your Convex deployment:

```sh
npx convex env set DAYTONA_API_KEY your_key
```

You can also use `DAYTONA_JWT_TOKEN` with `DAYTONA_ORGANIZATION_ID`, plus optional `DAYTONA_API_URL` and `DAYTONA_TARGET`.

For the Fly Sprites provider, set:

```sh
npx convex env set SANDBOX_PROVIDER sprites
npx convex env set SPRITES_TOKEN your_sprites_org_token
```

Or configure the runner explicitly:

```ts
const remote = new RemoteRunner(components.remoteRunner, {
  auth: {
    provider: "sprites",
    spritesToken: process.env.SPRITES_TOKEN,
  },
});
```

The `runCommand`, `defineAction`, bundled action, and durable job APIs stay the
same. Provider-specific sandbox fields are best-effort: Daytona honors image,
network, resource, and language settings; Sprites currently creates a default
Sprite and runs commands with HTTP exec.

### Rename From Daytona

This package used to be named `@convex-dev/daytona`. The primary API is now
provider-neutral:

- `RemoteRunner` replaces `DaytonaRunner`
- `defineRemoteHandler` replaces `defineDaytonaHandler`
- `convex-remote-runner build` replaces `convex-daytona build`
- `components.remoteRunner` replaces `components.daytona`
- `convex/remote/` replaces `convex/daytona/`

The old class, handler, and CLI names remain as compatibility aliases for now.

## Usage

Want to see the API shape in an app first? See the runnable demo in
[`demo/`](./demo). It includes a Vite UI, a Convex backend, explicit npm
package install, durable jobs, cancellation, DB context, and artifact records.

The easiest API is `remote.defineAction`. You define a regular Convex action,
but the handler function runs as JavaScript in a Node process inside a remote
sandbox.

```ts
import { RemoteRunner } from "@convex-dev/remote-runner";
import { v } from "convex/values";
import { components } from "./_generated/api.js";

const remote = new RemoteRunner(components.remoteRunner, {
  defaultCreate: {
    ephemeral: true,
    language: "javascript",
    autoStopInterval: 15,
  },
});

export const analyzeRepo = remote.defineAction({
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
      greeting: `hello ${name} from the remote sandbox`,
      node: `${process.version} on ${os.platform()}`,
      files: listing.stdout.trim().split("\n"),
    };
  },
});
```

Inside a `remote.defineAction` handler you can use Node globals, `fetch`,
dynamic `import(...)`, `require(...)`, `ctx.fs`, and `ctx.exec(...)`. The
handler is serialized and executed in a remote sandbox, so keep it self-contained: do
not close over app variables or imported helpers. Pass data through `args`,
`env`, `functions`, staged `files`, or a reused sandbox instead.

Packages are explicit. Pass `packages: ["octokit"]` for the common npm path, or
`install: { manager: "pnpm", packages: ["octokit"] }` /
`install: { command: "npm ci" }` when you want control.

## Bundled Remote Actions

Use bundled actions when you want remote code to be a real TypeScript module
with imports, typechecking, and linting. Add a build step to the app using the
component:

```json
{
  "scripts": {
    "remote:build": "convex-remote-runner build",
    "dev": "npm run remote:build && convex dev",
    "deploy": "npm run remote:build && convex deploy"
  }
}
```

Create files under `convex/remote/`:

```ts
// convex/remote/getStringLength.ts
import { defineRemoteHandler } from "@convex-dev/remote-runner/entry";
import type { internal } from "../_generated/api.js";
import { normalizeName } from "../lib/normalizeName.js";

export default defineRemoteHandler<{
  args: { userId: string; value: string };
  returns: { email: string; length: number };
  queries: {
    getUser: typeof internal.users.get;
  };
}>(async (ctx, args) => {
  const user = await ctx.queries.getUser({ userId: args.userId });
  await ctx.exec("node --version");
  return {
    email: normalizeName(user.email),
    length: args.value.length,
  };
});
```

Run `npm run remote:build`. The CLI bundles those modules and writes
`convex/remote/_generated/manifest.ts`. Then wire the generated bundle into a
normal Convex action:

```ts
import { RemoteRunner } from "@convex-dev/remote-runner";
import { v } from "convex/values";
import { bundles } from "./remote/_generated/manifest.js";
import { components, internal } from "./_generated/api.js";

const remote = new RemoteRunner(components.remoteRunner);

export const getStringLength = remote.defineBundledAction({
  args: { userId: v.string(), value: v.string() },
  returns: v.object({ email: v.string(), length: v.number() }),
  bundle: bundles.getStringLength,
  sandbox: { image: "node:22" },
  functions: {
    queries: {
      getUser: internal.users.get,
    },
  },
});
```

The bundled module can import pure helper modules from `convex/`, Node built-ins,
and npm packages. It cannot runtime-import Convex server APIs like
`convex/server`, `_generated/server`, or `_generated/api`; use type-only imports
for function reference types and pass the actual function handles through
`defineBundledAction({ functions })`.

## Calling Back Into Convex

To use `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` from the remote sandbox,
mount the component with an `httpPrefix` as shown above. The component owns a
`POST /callback` route, exposed at `/remote-runner/callback` with that prefix.

The action helper defaults the callback URL to
`${CONVEX_SITE_URL}/remote-runner/callback` and mints a per-run callback secret that
the component validates before running any function handle. You can also pass
`callbackUrl` and `callbackSecret` to `new RemoteRunner(...)`, or set
`REMOTE_RUNNER_CALLBACK_URL`, if you want to use an app-owned route instead.

Register the functions this remote action is allowed to call, then call them
by name from the remote-side `ctx`:

```ts
import { RemoteRunner } from "@convex-dev/remote-runner";
import { v } from "convex/values";
import { components, internal } from "./_generated/api.js";

const remote = new RemoteRunner(components.remoteRunner);

export const enrichUser = remote.defineAction({
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
    const user = await ctx.queries.getUser<{ email: string }>({ userId });
    const profile = await fetch(`https://example.com/profile/${user.email}`);
    await ctx.mutations.saveProfile({
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
const result = await remote.runCommand(ctx, {
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

## Admin Jobs

Admin operations are page-based. Use `listJobs` for dashboards, and use
`cancelJobs` when you explicitly want to process one bounded page yourself:

```ts
const page = await remote.listJobs(ctx, {
  status: "running",
  limit: 100,
});

const canceled = await remote.cancelJobs(ctx, {
  status: "running",
  beforeUpdatedAt: Date.now() - 10 * 60_000,
  cursor: page.nextCursor,
  limit: 100,
});
```

For “cancel all old jobs” or cleanup flows, start a resumable cleanup run. The
component stores progress and reschedules itself until all pages are processed:

```ts
const { cleanupId: cancelCleanupId } = await remote.cancelAllJobs(ctx, {
  batchSize: 100,
  olderThanMs: 10 * 60_000,
});

const { cleanupId } = await remote.startCleanup(ctx, {
  batchSize: 100,
  cancelActiveOlderThanMs: 10 * 60_000,
  deleteCompletedOlderThanMs: 24 * 60 * 60_000,
});
```

Poll cleanup status from a query:

```ts
const cleanup = await remote.getCleanup(ctx, { cleanupId });
```

Cleanup never scans all jobs in one function. It walks indexed pages, patches or
deletes only the current batch, records counters, and schedules the next page.

`seedDownloadUrl` is treated as a `tar.gz` archive and extracted before files
are staged. `capture.uploadUrl` is a consumer-provided upload URL; generate it
from your app when you want the archive in your own storage namespace.

## Durable Remote Actions

Use `defineDurableAction` when remote work should keep running after the
calling action returns. It uses the same JavaScript handler shape as
`defineAction`, but returns a component job id immediately. Output is stored as
sequence-indexed rows, so UIs can fetch only new lines.

```ts
export const runBuild = remote.defineDurableAction({
  args: { label: v.string() },
  sandbox: { image: "node:22" },
  packages: ["lodash"],
  output: {
    lineBuffered: true,
    redact: {
      env: ["OPENAI_API_KEY"],
      patterns: ["dtn_[A-Za-z0-9_\\-]+"],
    },
  },
  capture: { path: "coverage", uploadUrl },
  handler: async (ctx, { label }) => {
    const fs = ctx.require("node:fs") as typeof import("node:fs");
    const lodash = ctx.require("lodash") as {
      startCase(value: string): string;
    };

    fs.mkdirSync("coverage", { recursive: true });
    for (let step = 1; step <= 30; step += 1) {
      console.log("step " + step + "/30 for " + lodash.startCase(label));
      fs.appendFileSync("coverage/report.txt", "completed step " + step + "\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  },
});

export const buildStatus = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    return await remote.getJob(ctx, { jobId });
  },
});

export const buildOutput = query({
  args: {
    afterSequence: v.optional(v.number()),
    jobId: v.string(),
  },
  handler: async (ctx, args) => {
    return await remote.listJobOutput(ctx, args);
  },
});

export const cancelBuild = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    await remote.cancelJob(ctx, { jobId });
  },
});
```

Canceling a queued job prevents it from starting. Canceling a running job marks
it canceled and preserves that state; use a short Daytona timeout or delete the
sandbox from your app if you need hard process termination.

`startCommand` is still available when you want a lower-level command-shaped
durable job.

You can still use the small forms:

```ts
const sandbox = await remote.createSandbox(ctx, {
  create: { language: "python", autoStopInterval: 30 },
  files: [{ path: "hello.py", content: "print('hi')" }],
});

await remote.runCode(ctx, {
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
await ctx.runAction(components.remoteRunner.lib.runCommand, {
  auth: { apiKey: process.env.DAYTONA_API_KEY },
  command: "echo hello",
});
```

The direct API requires `auth` because Convex components do not inherit the app's environment variables.
