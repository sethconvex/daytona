import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
import { Daytona } from "@daytona/sdk";
import { z } from "zod";
import { Engine, type ServiceRun } from "./engine.js";
import { TemplateBuilder } from "./templates.js";
import { Store } from "./store.js";
import { DaytonaProvider } from "./daytona.js";
import {
  SandboxError,
  fileSchema,
  MAX_ARTIFACT_BYTES,
  MAX_FILE_BYTES,
  PREVIEW_BYTES,
} from "../sandbox/types.js";
const tenantSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  token: z.string().min(32),
  secrets: z.array(z.string()).default([]),
  uploadOrigins: z.array(z.string().url()).default([]),
});
export type Tenant = z.infer<typeof tenantSchema>;
const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/);
const pathSchema = z
  .string()
  .max(4096)
  .refine((p) => p.startsWith("/") && !p.includes("\0"));
function publicRun(run: ServiceRun) {
  const {
    id,
    workspaceId,
    status,
    stdout,
    stderr,
    durationMs,
    exitCode,
    completedAt,
    error,
  } = run;
  return {
    id,
    workspaceId,
    status,
    stdout,
    stderr,
    durationMs,
    exitCode,
    completedAt,
    error,
  };
}
export function createSandboxServer(
  engine: Engine,
  tenants: Tenant[],
  templates?: TemplateBuilder,
) {
  return createServer(async (req, res) => {
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    try {
      const auth = req.headers.authorization ?? "";
      const tenant = tenants.find((t) => {
        const expected = Buffer.from(`Bearer ${t.token}`),
          received = Buffer.from(auth);
        return (
          received.length === expected.length &&
          timingSafeEqual(received, expected)
        );
      });
      if (!tenant) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      const url = new URL(req.url ?? "/", "http://localhost");
      const [, collection, rawId, operation] = url.pathname.split("/");
      const id = idSchema.parse(rawId);
      let body: any = {};
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > MAX_FILE_BYTES * 2) {
            res.writeHead(413);
            res.end(JSON.stringify({ error: "Request too large" }));
            return;
          }
          chunks.push(Buffer.from(chunk));
        }
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      }
      let result: unknown;
      if (collection === "workspaces") {
        if (req.method === "POST" && !operation) {
          for (const secret of Object.values(body.config?.secrets ?? {}))
            if (!tenant.secrets.includes(String(secret)))
              throw new SandboxError(
                "VALIDATION",
                "Secret is not registered for this tenant.",
              );
          if (
            templates &&
            !templates.resolve(tenant.id, body.config?.template ?? "coding")
          )
            throw new SandboxError(
              "VALIDATION",
              "Template is missing, not ready, or belongs to another tenant.",
            );
          result = engine.create(tenant.id, id, body.config);
        } else if (req.method === "GET" && !operation)
          result = engine.workspace(tenant.id, id);
        else if (
          req.method === "POST" &&
          (operation === "suspend" || operation === "destroy")
        ) {
          await engine.lifecycle(tenant.id, id, operation);
          result = { ok: true };
        } else if (
          req.method === "POST" &&
          ["read", "write", "export"].includes(operation!)
        ) {
          const workspace = await engine.ready(tenant.id, id);
          const path = pathSchema.parse(body.path);
          if (operation === "write") {
            const file = fileSchema.parse(body);
            await engine.provider.write(
              workspace.providerId,
              path,
              Buffer.from(file.contents, file.encoding),
            );
            result = { ok: true };
          } else {
            const maxBytes = z
              .number()
              .int()
              .min(1)
              .max(operation === "export" ? MAX_ARTIFACT_BYTES : 512 * 1024)
              .parse(body.maxBytes ?? 512 * 1024);
            const data = await engine.provider.read(
              workspace.providerId,
              path,
              maxBytes,
            );
            if (operation === "read")
              result = { base64: Buffer.from(data).toString("base64") };
            else {
              const uploadUrl = new URL(z.string().url().parse(body.uploadUrl));
              if (
                (uploadUrl.protocol !== "https:" &&
                  !["127.0.0.1", "localhost"].includes(uploadUrl.hostname)) ||
                !tenant.uploadOrigins.includes(uploadUrl.origin)
              )
                throw new SandboxError(
                  "VALIDATION",
                  "Artifact upload origin is not registered for this tenant.",
                );
              const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "content-type": "application/octet-stream" },
                body: Buffer.from(data),
                redirect: "error",
                signal: AbortSignal.timeout(60_000),
              });
              if (!response.ok)
                throw new Error(`Artifact upload failed (${response.status}).`);
              const uploaded = (await response.json()) as { storageId: string };
              result = {
                storageId: z.string().parse(uploaded.storageId),
                size: data.length,
                preview: new TextDecoder().decode(data.slice(0, PREVIEW_BYTES)),
              };
            }
          }
        } else {
          res.writeHead(404);
          result = { error: "Unknown operation" };
        }
      } else if (collection === "templates" && templates) {
        if (req.method === "POST" && id === "build")
          result = templates.start(tenant.id, body);
        else if (req.method === "GET") {
          result = engine.store.get(tenant.id, "template", id);
          if (!result)
            throw new SandboxError("NOT_FOUND", "Template not found.");
        } else {
          res.writeHead(404);
          result = { error: "Unknown operation" };
        }
      } else if (collection === "runs") {
        if (req.method === "POST" && !operation)
          result = publicRun(
            engine.submit(
              tenant.id,
              id,
              idSchema.parse(body.workspaceId),
              body.job,
            ),
          );
        else if (req.method === "POST" && operation === "cancel")
          result = publicRun(engine.cancel(tenant.id, id));
        else if (req.method === "GET" && !operation)
          result = publicRun(engine.get(tenant.id, id));
        else {
          res.writeHead(404);
          result = { error: "Unknown operation" };
        }
      } else {
        res.writeHead(404);
        result = { error: "Unknown resource" };
      }
      res.end(JSON.stringify(result));
    } catch (error) {
      const status =
        error instanceof z.ZodError || error instanceof SyntaxError
          ? 400
          : error instanceof SandboxError
            ? {
                VALIDATION: 400,
                NOT_FOUND: 404,
                EXPIRED: 410,
                BUSY: 409,
                SERVICE: 502,
                FAILED: 422,
              }[error.code]
            : 502;
      res.writeHead(status);
      // Provider errors may include request headers; do not serialize them to tenants.
      res.end(
        JSON.stringify({
          error:
            error instanceof SandboxError
              ? error.message
              : status === 400
                ? "Invalid request"
                : "Provider operation failed; retry with the same request ID.",
        }),
      );
    }
  });
}
async function main() {
  if (!process.env.DAYTONA_API_KEY)
    throw new Error("Set DAYTONA_API_KEY on the service.");
  if (!process.env.SANDBOX_TENANTS_FILE)
    throw new Error(
      "Set SANDBOX_TENANTS_FILE to an operator-owned JSON credentials file.",
    );
  const tenants = z
    .array(tenantSchema)
    .min(1)
    .parse(JSON.parse(readFileSync(process.env.SANDBOX_TENANTS_FILE, "utf8")));
  if (
    new Set(tenants.map((t) => t.id)).size !== tenants.length ||
    new Set(tenants.map((t) => t.token)).size !== tenants.length
  )
    throw new Error("Tenant IDs and tokens must be unique.");
  process.umask(0o077);
  const store = new Store(process.env.SANDBOX_DATABASE ?? "sandbox.sqlite");
  const provider = new DaytonaProvider(
    new Daytona({ apiKey: process.env.DAYTONA_API_KEY }),
  );
  const engine = new Engine(store, provider);
  const templates = new TemplateBuilder(store, provider.daytona, provider);
  const server = createSandboxServer(engine, tenants, templates);
  const port = Number(process.env.PORT ?? 8090);
  let stopping = false;
  const worker = async () => {
    while (!stopping) {
      try {
        await engine.sweep();
      } catch {
        console.error("Sandbox reconciliation failed; will retry.");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };
  server.listen(port, process.env.HOST ?? "127.0.0.1", () =>
    console.log(`Sandbox service listening on ${port}`),
  );
  void worker();
  void (async () => {
    while (!stopping) {
      try {
        await templates.sweep();
      } catch {
        console.error("Template reconciliation failed; will retry.");
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  })();
  const stop = () => {
    stopping = true;
    server.close();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  void main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
