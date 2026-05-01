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

The easiest API is `daytona.action`. You define a regular Convex action, but
the handler function runs as JavaScript in a Daytona sandbox.

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

export const runInDaytona = daytona.action({
  args: { name: v.string() },
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
```

Inside a `daytona.action` handler you can use Node globals, `fetch`, dynamic
`import(...)`, or `require(...)`. The handler is serialized and executed in
Daytona, so keep it self-contained: do not close over app variables or imported
helpers. Pass data through `args`, `env`, `functions`, or a reused sandbox
instead.

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

export const enrichUser = daytona.action({
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

Lower-level APIs are available when you want explicit control from a normal
Convex action.

Run a shell command:

```ts
await daytona.runCommand(ctx, {
  command: "python --version && uname -a",
  timeout: 30,
});
```

Reuse a sandbox:

```ts
const sandbox = await daytona.createSandbox(ctx, {
  create: { language: "python", autoStopInterval: 30 },
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
