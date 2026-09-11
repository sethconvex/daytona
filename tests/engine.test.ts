import { afterEach, describe, expect, it } from "vitest";
import {
  Engine,
  type Provider,
  type Observation,
} from "../src/service/engine.js";
import { Store } from "../src/service/store.js";
import { SandboxError } from "../src/sandbox/types.js";

const stores: Store[] = [];
function setup() {
  const store = new Store(":memory:");
  stores.push(store);
  let launches = 0,
    executions = 0;
  const accepted = new Set<string>();
  const cancelled = new Set<string>();
  let dropResponse = false;
  const provider: Provider = {
    ensure: async (name) => name,
    resume: async () => {},
    suspend: async () => {},
    destroy: async () => {},
    stage: async () => {},
    read: async () => new Uint8Array(),
    write: async () => {},
    submit: async (_id, runId) => {
      launches++;
      if (!accepted.has(runId)) {
        accepted.add(runId);
        executions++;
      }
      if (dropResponse) {
        dropResponse = false;
        throw new Error("Connection lost after acceptance");
      }
    },
    observe: async (_id, runId): Promise<Observation> => ({
      status: cancelled.has(runId) ? "cancelled" : "running",
      stdout: { text: "hello", truncated: false },
      stderr: { text: "", truncated: false },
      durationMs: 10,
      exitCode: null,
    }),
    cancel: async (_id, runId) => {
      cancelled.add(runId);
    },
  };
  const engine = new Engine(store, provider);
  engine.create("tenant", "ws", { resources: "small" });
  return {
    store,
    engine,
    provider,
    accepted,
    cancelled,
    drop: () => {
      dropResponse = true;
    },
    count: () => ({ launches, executions }),
  };
}
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});
describe("durable service", () => {
  it("deduplicates matching requests and rejects changed payloads", () => {
    const { engine } = setup();
    const first = engine.submit("tenant", "run", "ws", {
      command: ["echo", "hello"],
    });
    expect(
      engine.submit("tenant", "run", "ws", { command: ["echo", "hello"] }),
    ).toEqual(first);
    expect(() =>
      engine.submit("tenant", "run", "ws", { command: ["echo", "different"] }),
    ).toThrow(/different/);
  });
  it("recovers an accepted launch after losing the response and restarting", async () => {
    const { engine, store, provider, drop, count } = setup();
    engine.submit("tenant", "run", "ws", { command: ["echo", "hello"] });
    drop();
    await engine.tick("tenant", "run");
    const restarted = new Engine(store, provider);
    await restarted.tick("tenant", "run");
    expect(count()).toEqual({ launches: 2, executions: 1 });
    expect(restarted.get("tenant", "run").status).toBe("running");
  });
  it("canceling queued work never launches compute", async () => {
    const { engine, count } = setup();
    engine.submit("tenant", "run", "ws", { command: ["sleep", "60"] });
    engine.cancel("tenant", "run");
    await engine.tick("tenant", "run");
    expect(count().executions).toBe(0);
    expect(engine.get("tenant", "run").status).toBe("cancelled");
  });
  it("reports cancellation only after provider confirmation", async () => {
    const { engine, provider } = setup();
    engine.submit("tenant", "run", "ws", { command: ["sleep", "60"] });
    await engine.tick("tenant", "run");
    engine.cancel("tenant", "run");
    expect(engine.get("tenant", "run").status).toBe("running");
    provider.cancel = async () => {
      throw new Error("Network down");
    };
    await engine.tick("tenant", "run");
    expect(engine.get("tenant", "run").status).toBe("running");
  });
  it("isolates tenant IDs and disallows stopping active work", async () => {
    const { engine } = setup();
    engine.submit("tenant", "run", "ws", { command: ["true"] });
    expect(() => engine.get("other", "run")).toThrow(SandboxError);
    await expect(engine.lifecycle("tenant", "ws", "suspend")).rejects.toThrow(
      /active/,
    );
  });
});
