# Convex Remote Runner Demo

This is the canonical runnable demo app for `@convex-dev/remote-runner`.

It shows:

- a `defineAction`-style flow running JavaScript in a remote Node sandbox
- a bundled TypeScript action importing a helper from the app's `convex/`
  directory and running that bundled code in a remote sandbox
- `packages: ["lodash"]` installing npm packages in a remote sandbox
- `ctx.runQuery`-style DB context fetched before the remote run
- durable jobs with polling, output, and cancellation
- artifact capture from a remote sandbox

## Run It

From this directory:

```sh
npm install
npx convex dev
```

In another terminal:

```sh
npm run dev
```

Set this Convex env var before running remote work:

```sh
npx convex env set DAYTONA_API_KEY your_daytona_key
```

`npx convex dev` writes `VITE_CONVEX_URL` to `.env.local` for the Vite app.

## Important Files

- `convex/remote.ts`: SDK-backed demo actions for the interactive UI
- `convex/bundled.ts`: the packaged component's bundled action API
- `convex/remote/getStringLength.ts`: remote TypeScript entry module
- `convex/remoteHelpers.ts`: app helper imported by the remote entry module
- `convex/remote/_generated/manifest.ts`: generated bundle manifest checked in for the demo
- `convex/jobs.ts`: durable job state and cancellation
- `convex/facts.ts`: Convex DB context used by the remote runner demo
- `convex/events.ts`: artifact records
- `src/App.tsx`: the UI that starts actions and polls durable jobs
