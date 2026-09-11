import { it, expect } from "vitest";
import { templateImage, TemplateBuilder } from "../src/service/templates.js";
import { Store } from "../src/service/store.js";
import { configSchema, jobSchema, durationMs } from "../src/sandbox/types.js";
it("validates resource units and bounded inputs", () => {
  expect(() =>
    configSchema.parse({
      resources: { cpu: 0, memory: "16GB", disk: "50GiB" },
    }),
  ).toThrow();
  expect(() => durationMs("999999999999d")).toThrow();
  expect(() => jobSchema.parse({ command: [] })).toThrow();
  expect(() =>
    jobSchema.parse({ command: ["true"], outputs: ["relative"] }),
  ).toThrow();
});
it("builds declarative runtime images without allowing Dockerfile injection", () => {
  const image = templateImage({
    name: "research",
    runtimes: { python: "3.13", node: "22" },
    packages: { pip: ["pandas==2.2.3"], npm: ["typescript@5.7.3"] },
  });
  expect(image.dockerfile).toContain("ubuntu:24.04");
  expect(image.dockerfile).toContain("pandas==2.2.3");
  expect(() =>
    templateImage({ name: "bad", runtimes: { node: "22\nRUN something" } }),
  ).toThrow();
  expect(() =>
    templateImage({ name: "bad", packages: { npm: ["typescript"] } }),
  ).toThrow(/Node/);
});
it("template identities are stable within a tenant and isolated across tenants", () => {
  const store = new Store(":memory:");
  try {
    const builder = new TemplateBuilder(
      store,
      {} as any,
      { images: {} } as any,
    );
    const spec = { name: "research" };
    expect(builder.start("one", spec).id).toBe(builder.start("one", spec).id);
    expect(builder.start("two", spec).id).not.toBe(
      builder.start("one", spec).id,
    );
    expect(builder.resolve("two", builder.start("one", spec).id)).toBe(false);
  } finally {
    store.close();
  }
});
