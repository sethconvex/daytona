// Test harness only. Executes fixed smoke-test commands on this machine, not a sandbox.
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { Engine } from "../dist/service/engine.js";
import { Store } from "../dist/service/store.js";
import { createSandboxServer } from "../dist/service/server.js";
import { supervisor, runDirectory } from "../dist/service/supervisor.js";
const root = resolve(".local-test/workspaces");
await mkdir(root, { recursive: true });
const translate = (id, path) =>
  path.startsWith("/workspace/") ? join(root, id, path.slice(11)) : path;
const provider = {
  ensure: async (id) => {
    await mkdir(join(root, id), { recursive: true });
    return id;
  },
  resume: async () => {},
  suspend: async () => {},
  destroy: async (id) => {
    await rm(join(root, id), { recursive: true, force: true });
  },
  stage: async (id, runId, job) => {
    for (const f of job.files ?? []) {
      const p = translate(id, f.path);
      await writeFile(p, f.contents);
    }
    await mkdir(runDirectory(runId), { recursive: true });
    await writeFile(
      runDirectory(runId) + "/supervisor.py",
      supervisor(runId, { ...job, cwd: join(root, id) }),
    );
  },
  submit: async (_id, runId) => {
    const child = spawn("python3", [runDirectory(runId) + "/supervisor.py"], {
      stdio: "ignore",
    });
    child.unref();
  },
  observe: async (_id, runId) => {
    const dir = runDirectory(runId);
    const result = existsSync(dir + "/result.json")
      ? JSON.parse(await readFile(dir + "/result.json", "utf8"))
      : { status: "running", durationMs: 0, exitCode: null };
    for (const stream of ["stdout", "stderr"])
      result[stream] = {
        text: existsSync(dir + "/" + stream)
          ? (await readFile(dir + "/" + stream, "utf8")).slice(0, 16384)
          : "",
        truncated: false,
        outputPath: dir + "/" + stream,
      };
    return result;
  },
  cancel: async (_id, runId) => {
    await mkdir(runDirectory(runId), { recursive: true });
    await writeFile(runDirectory(runId) + "/cancel", "cancel");
  },
  read: async (id, path, maxBytes) => {
    const bytes = await readFile(translate(id, path));
    if (bytes.length > maxBytes) throw new Error("Oversized file");
    return bytes;
  },
  write: async (id, path, bytes) => {
    await writeFile(translate(id, path), bytes);
  },
};
const token = randomBytes(32).toString("hex");
await writeFile(
  ".local-test/service.env",
  `SANDBOX_SERVICE_URL=http://127.0.0.1:8099\nSANDBOX_SERVICE_TOKEN=${token}\n`,
  { mode: 0o600 },
);
const engine = new Engine(new Store(".local-test/service.sqlite"), provider);
const server = createSandboxServer(engine, [
  {
    id: "smoke",
    token,
    secrets: [],
    uploadOrigins: ["http://127.0.0.1:3290", "http://127.0.0.1:3291"],
  },
]);
server.listen(8099, "127.0.0.1", () =>
  console.log("Local smoke service ready on 8099"),
);
let running = false;
setInterval(async () => {
  if (running) return;
  running = true;
  try {
    await engine.sweep();
  } finally {
    running = false;
  }
}, 250);
