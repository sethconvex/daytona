import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { supervisor, runDirectory } from "../src/service/supervisor.js";
async function launch(script: string) {
  const child = spawn("python3", ["-c", script], { stdio: "pipe" });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  return new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(stderr)),
    );
  });
}
describe("remote supervisor (real subprocesses)", () => {
  it("concurrent and repeated launchers execute the command once", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "sandbox-test-"));
    const runId = crypto.randomUUID(),
      root = runDirectory(runId);
    try {
      const script = supervisor(runId, {
        command: [
          "python3",
          "-c",
          "import time;open('effects','a').write('one\\n');time.sleep(0.2);print('ok')",
        ],
        cwd,
        timeout: "10s",
      });
      await Promise.all([launch(script), launch(script)]);
      await launch(script);
      expect(await readFile(join(cwd, "effects"), "utf8")).toBe("one\n");
      expect(
        JSON.parse(await readFile(root + "/result.json", "utf8")),
      ).toMatchObject({ status: "exited", exitCode: 0 });
    } finally {
      await rm(cwd, { recursive: true, force: true });
      await rm(root, { recursive: true, force: true });
    }
  });
  it("returns non-zero exits and enforces a timeout", async () => {
    const id = crypto.randomUUID(),
      root = runDirectory(id);
    try {
      await launch(
        supervisor(id, {
          command: ["python3", "-c", "import time;time.sleep(30)"],
          cwd: tmpdir(),
          timeout: "1s",
        }),
      );
      expect(
        JSON.parse(await readFile(root + "/result.json", "utf8")),
      ).toMatchObject({ status: "timedOut", exitCode: null });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("honors cancellation before the launcher reaches the sandbox", async () => {
    const id = crypto.randomUUID(),
      root = runDirectory(id);
    try {
      await mkdir(root, { recursive: true });
      await writeFile(root + "/cancel", "cancel");
      await launch(supervisor(id, { command: ["false"], cwd: tmpdir() }));
      expect(
        JSON.parse(await readFile(root + "/result.json", "utf8")),
      ).toMatchObject({ status: "cancelled" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
