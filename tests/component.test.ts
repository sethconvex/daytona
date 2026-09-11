import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import { describe, it, expect, vi, afterEach } from "vitest";
import schema from "../src/component/schema.js";
const modules = import.meta.glob("../src/component/**/*.ts");
const service = {
  url: "https://service.example.com",
  token: "test-service-token",
};
afterEach(() => vi.useRealTimers());
describe("required component", () => {
  it("atomically deduplicates submissions and rejects different work under a key", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const args = {
      config: JSON.stringify({ resources: "small" }),
      job: JSON.stringify({ command: ["true"] }),
      requestId: "request-one",
      service,
    };
    const first = await t.mutation(anyApi.sandboxes.start, args);
    expect(await t.mutation(anyApi.sandboxes.start, args)).toBe(first);
    await expect(
      t.mutation(anyApi.sandboxes.start, {
        ...args,
        job: JSON.stringify({ command: ["false"] }),
      }),
    ).rejects.toThrow(/different/);
    expect(
      await t.run(async (ctx) => (await ctx.db.query("runs").collect()).length),
    ).toBe(1);
    expect(
      await t.run(
        async (ctx) =>
          (await ctx.db.system.query("_scheduled_functions").collect()).length,
      ),
    ).toBe(1);
  });
  it("concurrent first calls share a thread workspace and expiry replaces it", async () => {
    const t = convexTest(schema, modules);
    const args = {
      config: JSON.stringify({ resources: "small" }),
      threadKey: "agent/thread",
    };
    const ids = await Promise.all([
      t.mutation(anyApi.sandboxes.create, args),
      t.mutation(anyApi.sandboxes.create, args),
    ]);
    expect(ids[0]).toBe(ids[1]);
    await t.run(async (ctx) =>
      ctx.db.patch(ids[0], { expiresAt: Date.now() - 1 }),
    );
    const replacement = await t.mutation(anyApi.sandboxes.create, args);
    expect(replacement).not.toBe(ids[0]);
  });
  it("cancel is a request and does not assert process termination", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const id = await t.mutation(anyApi.sandboxes.start, {
      config: JSON.stringify({ resources: "small" }),
      job: JSON.stringify({ command: ["sleep", "60"] }),
      requestId: "cancel-test",
      service,
    });
    await t.mutation(anyApi.sandboxes.cancel, { runId: id });
    const run = await t.query(anyApi.sandboxes.getRun, { runId: id });
    expect(run).toMatchObject({
      cancelRequested: true,
      finalized: false,
      status: "queued",
    });
  });
});

it("callback secrets cannot invoke unregistered handles or expand their capabilities", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  await t.mutation(anyApi.lib.registerCallbackSecret, {
    secret: "one-run",
    expiresAt: now + 1000,
    capabilities: ["query:handle-one"],
  });
  expect(
    await t.query(anyApi.lib.validateCallbackCapability, {
      secret: "one-run",
      capability: "query:handle-one",
      now,
    }),
  ).toBe(true);
  expect(
    await t.query(anyApi.lib.validateCallbackCapability, {
      secret: "one-run",
      capability: "mutation:handle-two",
      now,
    }),
  ).toBe(false);
  await expect(
    t.mutation(anyApi.lib.registerCallbackSecret, {
      secret: "one-run",
      expiresAt: now + 1000,
      capabilities: ["query:handle-one", "mutation:handle-two"],
    }),
  ).rejects.toThrow(/different capabilities/);
});
