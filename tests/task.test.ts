import { convexTest } from "convex-test";
import { anyApi, createFunctionHandle } from "convex/server";
import { it, expect, vi, afterEach } from "vitest";
import schema from "../src/component/schema.js";
const modules = {
  ...import.meta.glob("../src/component/**/*.ts"),
  "../src/component/callbacks.ts": () => import("./fixtures/callbacks.js"),
};
afterEach(() => vi.useRealTimers());
async function scenario(context = {}) {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const onSuccess = await t.run(() =>
    createFunctionHandle(anyApi.callbacks.success),
  );
  const onFailure = await t.run(() =>
    createFunctionHandle(anyApi.callbacks.failure),
  );
  const task = await t.mutation(anyApi.sandboxes.taskStart, {
    name: "test",
    config: {
      config: JSON.stringify({ resources: "small" }),
      job: JSON.stringify({ command: ["true"] }),
      service: { url: "https://unused.test", token: "token" },
    },
    onSuccess,
    onFailure,
    context,
  });
  await t.run(async (ctx) =>
    ctx.db.patch(task.id, {
      finalized: true,
      status: "exited",
      result: {
        status: "exited",
        exitCode: 7,
        durationMs: 1,
        stdout: { text: "", truncated: false },
        stderr: { text: "", truncated: false },
      },
    }),
  );
  return { t, id: task.id };
}
it("success callback and delivered state commit together, even for nonzero exit", async () => {
  const { t, id } = await scenario();
  await t.action(anyApi.sandboxes.deliverTask, { runId: id });
  await t.action(anyApi.sandboxes.deliverTask, { runId: id });
  const rows = await t.run((ctx) => ctx.db.query("callbackSecrets").collect());
  expect(rows.map((row) => row.secret)).toEqual([`success:${id}`]);
  expect((await t.query(anyApi.sandboxes.getRun, { runId: id })).delivery).toBe(
    "succeeded",
  );
});
it("a throwing success callback rolls back and schedules one failure attempt", async () => {
  const { t, id } = await scenario({ throwSuccess: true });
  await t.action(anyApi.sandboxes.deliverTask, { runId: id });
  await t.mutation(anyApi.sandboxes.taskFailure, {
    runId: id,
    error: "duplicate delivery",
  });
  const before = await t.query(anyApi.sandboxes.getRun, { runId: id });
  expect(before.delivery).toBe("failureScheduled");
  expect(
    await t.run((ctx) => ctx.db.query("callbackSecrets").collect()),
  ).toEqual([]);
  await t.mutation(anyApi.sandboxes.invokeTaskFailure, {
    runId: id,
    error: "failure",
  });
  await t.mutation(anyApi.sandboxes.invokeTaskFailure, {
    runId: id,
    error: "duplicate",
  });
  expect(
    (await t.run((ctx) => ctx.db.query("callbackSecrets").collect())).map(
      (row) => row.secret,
    ),
  ).toEqual([`failure:${id}`]);
});
it("a dispatcher that never starts still schedules failure at the deadline", async () => {
  const { t, id } = await scenario();
  await t.mutation(anyApi.sandboxes.deliveryDeadline, { runId: id });
  expect((await t.query(anyApi.sandboxes.getRun, { runId: id })).delivery).toBe(
    "failureScheduled",
  );
});

it("does not schedule another attempt when the failure callback throws", async () => {
  const { t, id } = await scenario({ throwSuccess: true, throwFailure: true });
  await t.action(anyApi.sandboxes.deliverTask, { runId: id });
  const before = await t.run((ctx) => ctx.db.get(id));
  await expect(
    t.mutation(anyApi.sandboxes.invokeTaskFailure, {
      runId: id,
      error: "callback failure",
    }),
  ).rejects.toThrow("Deliberate failure callback failure");
  await t.mutation(anyApi.sandboxes.taskFailure, {
    runId: id,
    error: "late fallback",
  });
  await t.action(anyApi.sandboxes.deliverTask, { runId: id });
  const after = await t.run((ctx) => ctx.db.get(id));
  expect(after?.failureScheduledId).toBe(before?.failureScheduledId);
  expect(after?.delivery).toBe("failureScheduled");
  expect(
    await t.run((ctx) => ctx.db.query("callbackSecrets").collect()),
  ).toEqual([]);
});
