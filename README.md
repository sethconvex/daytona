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

```ts
import { DaytonaRunner } from "@convex-dev/daytona";
import { v } from "convex/values";
import { components } from "./_generated/api.js";
import { action } from "./_generated/server.js";

const daytona = new DaytonaRunner(components.daytona, {
  defaultCreate: {
    ephemeral: true,
    language: "typescript",
    autoStopInterval: 15,
  },
});

export const runInDaytona = action({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await daytona.runAction(ctx, {
      kind: "code",
      language: "typescript",
      code: `console.log("hello ${args.name} from Daytona")`,
      timeout: 30,
    });
  },
});
```

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
