# Convex Daytona Demo

This is the canonical runnable demo app for `@convex-dev/daytona`.

It shows:

- a `defineAction`-style flow running JavaScript in a Daytona Node sandbox
- a bundled TypeScript action importing a helper from the app's `convex/`
  directory and running that bundled code in Daytona
- `packages: ["lodash"]` installing npm packages in Daytona
- `ctx.runQuery`-style DB context fetched before the Daytona run
- durable jobs with polling, output, and cancellation
- artifact capture from a Daytona sandbox

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

Set this Convex env var before running Daytona work:

```sh
npx convex env set DAYTONA_API_KEY your_daytona_key
```

`npx convex dev` writes `VITE_CONVEX_URL` to `.env.local` for the Vite app.

## Important Files

- `convex/daytona.ts`: SDK-backed demo actions for the interactive UI
- `convex/bundled.ts`: the packaged component's bundled action API
- `convex/daytona/getStringLength.ts`: Daytona TypeScript entry module
- `convex/daytonaHelpers.ts`: app helper imported by the Daytona entry module
- `convex/daytonaManifest.ts`: generated bundle manifest checked in for the demo
- `convex/jobs.ts`: durable job state and cancellation
- `convex/facts.ts`: Convex DB context used by the Daytona demo
- `convex/events.ts`: artifact records
- `src/App.tsx`: the UI that starts actions and polls durable jobs
