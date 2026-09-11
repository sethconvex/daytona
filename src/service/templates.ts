import { createHash } from "node:crypto";
import { DaytonaNotFoundError, Image, type Daytona } from "@daytona/sdk";
import { z } from "zod";
import { Store } from "./store.js";
import { quote } from "./supervisor.js";
import type { DaytonaProvider } from "./daytona.js";
const version = z.string().regex(/^\d+(\.\d+){0,2}$/);
const packages = z
  .array(
    z
      .string()
      .min(1)
      .max(200)
      .refine((s) => !/[\n\r\0]/.test(s)),
  )
  .max(100);
export const templateSchema = z
  .object({
    name: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    base: z.enum(["ubuntu-24.04", "debian-bookworm"]).default("ubuntu-24.04"),
    runtimes: z
      .object({ python: version.default("3.13"), node: version.optional() })
      .default({ python: "3.13" }),
    packages: z
      .object({
        apt: packages.optional(),
        pip: packages.optional(),
        npm: packages.optional(),
      })
      .default({}),
  })
  .strict();
export type TemplateSpec = z.input<typeof templateSchema>;
export type BuiltTemplate = {
  id: string;
  spec: TemplateSpec;
  status: "queued" | "building" | "ready" | "failed";
  logs: string;
  image?: string;
  error?: string;
};
export function templateImage(input: TemplateSpec): Image {
  const spec = templateSchema.parse(input);
  const base =
    spec.base === "ubuntu-24.04" ? "ubuntu:24.04" : "debian:bookworm-slim";
  const apt = [
    "ca-certificates",
    "git",
    "curl",
    "ripgrep",
    ...(spec.packages.apt ?? []),
  ];
  let image = Image.base(base)
    .runCommands(
      `apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y -- ${apt.map(quote).join(" ")} && rm -rf /var/lib/apt/lists/*`,
    )
    .dockerfileCommands([
      "COPY --from=ghcr.io/astral-sh/uv:0.8.22 /uv /usr/local/bin/uv",
    ])
    .runCommands(
      `UV_PYTHON_INSTALL_DIR=/opt/python uv python install ${quote(spec.runtimes.python)} && ln -sf $(find /opt/python -path '*/bin/python3' | head -1) /usr/local/bin/python3 && ln -sf /usr/local/bin/python3 /usr/local/bin/python && mkdir -p /workspace`,
    );
  if (spec.runtimes.node) {
    const node = `node:${spec.runtimes.node}-bookworm-slim`;
    image = image
      .dockerfileCommands([
        `COPY --from=${node} /usr/local/bin/node /usr/local/bin/node`,
        `COPY --from=${node} /usr/local/lib/node_modules /usr/local/lib/node_modules`,
      ])
      .runCommands(
        "ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx",
      );
  }
  if (spec.packages.pip?.length)
    image = image.runCommands(
      `uv pip install --python /usr/local/bin/python3 --system -- ${spec.packages.pip.map(quote).join(" ")}`,
    );
  if (spec.packages.npm?.length) {
    if (!spec.runtimes.node)
      throw new Error("npm packages require a Node runtime.");
    image = image.runCommands(
      `npm install --global -- ${spec.packages.npm.map(quote).join(" ")}`,
    );
  }
  return image;
}
export class TemplateBuilder {
  constructor(
    readonly store: Store,
    readonly daytona: Daytona,
    readonly provider: DaytonaProvider,
  ) {}
  start(tenant: string, input: TemplateSpec): BuiltTemplate {
    const spec = templateSchema.parse(input);
    const id = `tpl-${createHash("sha256")
      .update(JSON.stringify([tenant, spec]))
      .digest("hex")
      .slice(0, 40)}`;
    const previous = this.store.get<BuiltTemplate>(tenant, "template", id);
    if (previous) return previous;
    templateImage(spec); // Validate before accepting.
    const template: BuiltTemplate = { id, spec, status: "queued", logs: "" };
    this.store.put(tenant, "template", id, template);
    return template;
  }
  resolve(tenant: string, id: string): boolean {
    if (["python", "node", "coding"].includes(id)) return true;
    const template = this.store.get<BuiltTemplate>(tenant, "template", id);
    if (!template || template.status !== "ready" || !template.image)
      return false;
    this.provider.images[id] = template.image;
    return true;
  }
  async sweep() {
    let cursor = "";
    while (true) {
      const page = this.store.list<BuiltTemplate>("template", cursor);
      for (const row of page) {
        const template = row.data;
        if (template.status === "ready") {
          this.resolve(row.tenant, row.id);
          continue;
        }
        if (template.status === "failed") continue;
        try {
          template.status = "building";
          this.store.put(row.tenant, "template", row.id, template);
          let snapshot;
          try {
            snapshot = await this.daytona.snapshot.get(template.id);
          } catch (error) {
            if (!(error instanceof DaytonaNotFoundError)) throw error;
            snapshot = await this.daytona.snapshot.create(
              { name: template.id, image: templateImage(template.spec) },
              {
                onLogs: (chunk) => {
                  template.logs = (template.logs + chunk).slice(-16_384);
                  this.store.put(row.tenant, "template", row.id, template);
                },
              },
            );
          }
          if (snapshot.state === "active") {
            template.image = snapshot.imageName;
            template.status = "ready";
          } else if (
            String(snapshot.state).includes("failed") ||
            snapshot.state === "error"
          ) {
            template.status = "failed";
            template.error = "Daytona template build failed.";
          }
          this.store.put(row.tenant, "template", row.id, template);
          this.resolve(row.tenant, row.id);
        } catch {
          template.error =
            "Build response uncertain; reconciling the same snapshot name.";
          this.store.put(row.tenant, "template", row.id, template);
        }
      }
      if (page.length < 100) break;
      cursor = page.at(-1)!.cursor;
    }
  }
}
