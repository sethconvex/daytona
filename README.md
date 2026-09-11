# Convex Sandbox

`@convex-dev/sandbox` provides a required Convex component, a server-side
TypeScript client, and a separately deployed Daytona-backed service. The service
owns provider credentials and execution; the component owns logical IDs,
reactive run status, exported artifacts, and task callbacks.

This repository contains an implementation and local integration tests. It is
**not a launched Convex resell service**: production hosting, Convex invoice
integration, and live Daytona acceptance testing are deployment work.

The existing `RemoteRunner`, `DaytonaRunner`, remote-handler APIs and CLI aliases
remain exported. See [remote actions and migration](docs/remote-runner.md).
The GitHub repository remains `sethconvex/daytona`.

## Install

From a local checkout, run `npm install` and `npm run build`. The package has been
renamed in this repository; this change does not publish it to npm.

```ts
// convex/convex.config.ts
import { defineApp } from "convex/server";
import sandbox from "@convex-dev/sandbox/convex.config";
const app = defineApp();
app.use(sandbox);
export default app;
```

```ts
// convex/sandbox.ts
import { Sandbox, templates } from "@convex-dev/sandbox";
import { components } from "./_generated/api";
export const sandbox = new Sandbox(components.sandbox, {
  defaults: {
    template: templates.coding,
    resources: "small",
    idleTimeout: "10m",
  },
});
```

Set `SANDBOX_SERVICE_URL` and `SANDBOX_SERVICE_TOKEN` in the application deployment.
The Daytona API key belongs only on the service. App wrappers must authorize
workspace, run, thread, and artifact access before invoking the component.
An ID is not authorization.

## Commands and workspaces

```ts
// An Action can wait for a result.
const result = await sandbox.run(ctx, {
  command: ["python3", "-c", "print(2 + 2)"],
  requestId: "business-operation/attempt-1",
});

// A mutation or Action can submit durable work and return immediately.
const instance = await sandbox.create(ctx);
await instance.files.write(ctx, {
  path: "/workspace/hello.py",
  contents: "print('hello')",
});
const runId = await instance.start(ctx, {
  command: ["python3", "/workspace/hello.py"],
  timeout: "1h",
  requestId: "project-build/attempt-1",
});
const run = await sandbox.runs.get(ctx, runId); // query-compatible
await sandbox.runs.cancel(ctx, runId); // requests termination
```

`create` allocates a logical ID; the first command or file operation starts
compute. Save `instance.id` and reconstruct with `sandbox.fromId(id)`.
`instance.suspend(ctx)` preserves files and resumes on the next operation.
`instance.destroy(ctx)` deletes compute and workspace files. Active runs must
finish or be canceled first. Exported artifacts have their own retention.

A matching `requestId` and payload returns the same run. Reusing the key for a
different payload throws. An explicit retry uses a new key. Save the request ID
before submission when recovery after an uncertain response matters.

`run()` waits inside its calling Action and remains subject to that Action's
limit. The accepted run continues independently. Use `start()` for long jobs,
then query status or use task callbacks. No observer holds an Action open for
the lifetime of the remote process.

Run states are `queued`, `running`, `exited`, `timedOut`, `cancelled`, `failed`.
Nonzero process exits remain `exited` results. `finalized` becomes true after
exports and temporary cleanup. Cancellation is not reported as complete until
termination is observed. Uncertain provider responses remain recoverable work.

## Files and artifacts

```ts
const result = await sandbox.run(ctx, {
  command: ["python3", "-c", "open('report.txt','w').write('done')"],
  outputs: ["/workspace/report.txt"],
  exportLogs: true,
  artifactRetention: "7d",
});
const id = result.artifacts[0].artifactId;
const metadata = await sandbox.artifacts.get(ctx, id);
const text = await sandbox.artifacts.readText(ctx, id);
const url = await sandbox.artifacts.getUrl(ctx, id);
```

Files support UTF-8 writes, base64 upload/download, bounded reads and search.
Full logs stay in Daytona. Results contain bounded stdout/stderr previews and
paths while the workspace exists. `exportLogs` exports stdout and stderr as
ordinary artifacts. Temporary output paths are removed from finalized results.
Missing or oversized selected outputs fail the job. Artifact exports use
component-owned storage upload URLs; artifacts survive workspace deletion.

Current limits are explicit implementation defaults: 16 KiB per output preview,
512 KiB total inline inputs, 512 KiB file reads/writes, 32 MiB per exported
artifact, 20 selected outputs plus two optional logs, 7-day default retention,
and a 1-hour default command timeout. Durations accept `s/m/h/d`, up to 30 days.
Large files should use artifact exports. Resource presets are:

| Preset | CPU | Memory | Disk   |
| ------ | --- | ------ | ------ |
| small  | 1   | 1 GiB  | 3 GiB  |
| medium | 2   | 4 GiB  | 10 GiB |
| large  | 4   | 8 GiB  | 20 GiB |

Explicit resources replace the preset. Daytona accepts whole-GiB allocations;
unsupported GPU names/configurations fail rather than silently downgrading.
GPU availability and image compatibility remain subject to Daytona validation.

## Templates

Built-ins: `python` uses Python 3.13 on Debian; `node` uses Node 22 with Python 3
for execution supervision; `coding` adds Git, curl, ripgrep and Python tooling.

```ts
const template = await sandbox.templates.start(ctx, {
  name: "research",
  base: "ubuntu-24.04",
  runtimes: { python: "3.13", node: "22" },
  packages: {
    apt: ["ffmpeg"],
    pip: ["pandas==2.2.3"],
    npm: ["typescript@5.7.3"],
  },
});
const status = await sandbox.templates.get(ctx, template.id);
// After status.status === "ready":
const workspace = await sandbox.create(ctx, { template: template.id });
```

Builds use Daytona snapshots and retain their image reference. Template IDs are
content-derived and tenant-scoped. `build(ctx, spec)` also exists for callers
that want to wait; use `start/get` for long builds. Build logs retain a 16 KiB
preview. Python dependencies are installed into the image's managed Python;
npm dependencies are global. Project lockfiles stay in the repository. Automatic
template expiry and full build-log export are not implemented.

## Agent tools

```ts
// In an @convex-dev/agent Agent definition:
tools: {
  sandbox: sandbox.tool({ agentComponent: "agent" });
}
// Or bind an application-owned workspace:
tools: {
  sandbox: sandbox.fromId(project.sandboxId).tool();
}
```

The component allocates one workspace per explicit Agent-component name/thread
pair, including concurrent first calls. Expired automatic workspaces are
replaced and tools report `reset: true`. Normal operations are serialized;
background commands return run IDs. `sandbox.codingTools()` exposes separate
run/read/write/search/inspect/cancel tools using the same workspace.

## Durable Task Protocol

The task adapter implements the supplied mutation-handle protocol:

```ts
import { startTask } from "@convex-dev/sandbox";
const task = await sandbox.task({ command: ["python3", "-c", "print(4)"] });
const { id, cancel } = await startTask(ctx, task, {
  onSuccess: internal.jobs.succeeded,
  onFailure: internal.jobs.failed,
  context: { projectId },
});
await ctx.runMutation(cancel, { id });
```

`task()` is asynchronous because Convex function-handle creation is asynchronous.
Its resolved value is a serializable `{ name, start, config }` leaf task. It
rejects a nonempty child `taskStack`. An orchestrator implementing the supplied
protocol can consume it, e.g. `step.runTask(await sandbox.task(...))`; this
package does not add `runTask` to existing Workflow releases.

A committed success callback and delivery marker share a transaction. If success
throws, the component schedules failure once. A deadline also covers dispatcher
crashes. A throwing failure callback is not resubmitted; its scheduled-function
ID remains on the run for diagnosis. Nonzero exits and timeouts return process
results through success; canceled work uses `{ kind: "canceled" }` failure.

## Run the service

The service requires Node 22.13+ and a persistent SQLite filesystem. Run one
service process per database. SQLite is a single-host deployment choice, not a
multi-replica coordination layer.

Create an operator-owned tenant file (restrict permissions; do not commit it):

```json
[
  {
    "id": "customer-deployment",
    "token": "a-random-service-token-at-least-32-characters-long",
    "secrets": ["github-readonly"],
    "uploadOrigins": ["https://YOUR-CONVEX-UPLOAD-ORIGIN"]
  }
]
```

The upload origin must exactly match the origin of upload URLs generated by
that deployment's component storage. Arbitrary upload destinations and redirects
are rejected. Use a separate tenant/token per application deployment/component
installation. Rotate service tokens by restarting with an updated tenant file.

Set `DAYTONA_API_KEY`, `SANDBOX_TENANTS_FILE`, and `SANDBOX_DATABASE`, then:

```sh
npm run build
npm run service
```

The service binds loopback by default. For deployment, set `HOST=0.0.0.0`, place
it behind authenticated TLS termination, mount persistent storage, and supply
secrets through the host's secret manager. `Dockerfile` provides a build target.

Daytona credential references are restricted to each tenant's registered names
and require nonempty host allowlists. This supports Daytona's HTTPS-header
substitution; **method/path policy is not implemented**. Do not expose credentials
whose safety depends on those additional restrictions. There is no Convex invoice
integration or production spend enforcement in this package yet.

## Development and verification

```sh
npm install
npm run build
npm test
npm run typecheck
npm run typecheck --workspace demo
```

The test suite exercises real supervisor subprocesses, uncertain-response
recovery, submission deduplication, tenant isolation, thread allocation,
resource validation and DTP callbacks. `scripts/local-backend.mjs`,
`scripts/local-service.mjs`, and `scripts/smoke.mjs` support a local end-to-end
run/export/cleanup test. The local service harness executes trusted test commands
on the developer machine; it is not a sandbox provider and must not be exposed.
