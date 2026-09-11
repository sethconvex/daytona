import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
const env = Object.fromEntries(
  readFileSync(".local-test/convex.env", "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
const service = Object.fromEntries(
  readFileSync(".local-test/service.env", "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);
const client = new ConvexHttpClient(env.CONVEX_SELF_HOSTED_URL);
client.setAdminAuth(env.CONVEX_SELF_HOSTED_ADMIN_KEY);
const configured = await fetch(
  env.CONVEX_SELF_HOSTED_URL + "/api/update_environment_variables",
  {
    method: "POST",
    headers: {
      authorization: `Convex ${env.CONVEX_SELF_HOSTED_ADMIN_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      changes: Object.entries(service).map(([name, value]) => ({
        name,
        value,
      })),
    }),
  },
);
if (!configured.ok)
  throw new Error(`Environment setup failed: ${configured.status}`);
const runId = await client.mutation(anyApi.sandboxSmoke.start, {});
const deadline = Date.now() + 90_000;
while (Date.now() < deadline) {
  const run = await client.query(anyApi.sandboxSmoke.status, { runId });
  if (run.finalized) {
    if (run.status !== "exited" || run.result.exitCode !== 0)
      throw new Error(JSON.stringify(run));
    const text = await client.action(anyApi.sandboxSmoke.artifact, {
      id: run.artifacts[0].artifactId,
    });
    if (text !== "artifact survived cleanup")
      throw new Error("Artifact mismatch.");
    console.log(
      JSON.stringify({
        runId,
        status: run.status,
        stdout: run.result.stdout.text,
        artifact: text,
        temporaryOutputPathRemoved: run.result.stdout.outputPath === undefined,
      }),
    );
    const taskId = await client.mutation(anyApi.sandboxSmoke.task, {});
    for (let attempt = 0; attempt < 60; attempt++) {
      const callback = await client.query(anyApi.sandboxSmoke.taskResult, {
        runId: taskId,
      });
      if (callback) {
        const result = JSON.parse(callback.value);
        if (result.kind !== "success" || result.returnValue.exitCode !== 7)
          throw new Error("DTP result mismatch");
        console.log(
          JSON.stringify({
            taskId,
            callback: result.kind,
            exitCode: result.returnValue.exitCode,
          }),
        );
        process.exit(0);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("DTP callback did not arrive");
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error("Smoke run did not complete within 90s.");
