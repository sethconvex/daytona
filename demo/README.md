# Convex Daytona Demo

This is a runnable demo app for the Daytona + Convex API shape.

The demo uses `"use node"` Convex app actions to call the Daytona SDK directly.
That is intentional for now: Convex components cannot currently run Node
runtime code, so the production package should keep Daytona execution in app
Node actions and use the component for durable state/callback coordination.

It shows:

- a `defineAction`-style flow running JavaScript in a Daytona Node sandbox
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

- `convex/daytona.ts`: the Daytona execution examples
- `convex/jobs.ts`: durable job state and cancellation
- `convex/facts.ts`: Convex DB context used by the Daytona demo
- `convex/events.ts`: artifact records
- `src/App.tsx`: the UI that starts actions and polls durable jobs
