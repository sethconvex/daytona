import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const binary = process.env.CONVEX_BACKEND_BINARY;
if (!binary)
  throw new Error(
    "Set CONVEX_BACKEND_BINARY to a local Convex backend executable.",
  );
const root = resolve(".local-test");
mkdirSync(root, { recursive: true });
const secretPath = resolve(root, "secret");
if (!existsSync(secretPath))
  writeFileSync(secretPath, randomBytes(32).toString("hex"), { mode: 0o600 });
const secret = readFileSync(secretPath, "utf8");
const name = "sandbox-local-test";
const key = execFileSync(binary, ["keygen", "--help"], { encoding: "utf8" });
if (!key.includes("admin-key"))
  throw new Error("Backend lacks admin-key generation.");
const adminKey = execFileSync(
  binary,
  ["keygen", "admin-key", "--instance-name", name, "--instance-secret", secret],
  { encoding: "utf8" },
).trim();
writeFileSync(
  resolve(root, "convex.env"),
  `CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3290\nCONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey}\n`,
  { mode: 0o600 },
);
const child = spawn(
  binary,
  [
    "--interface",
    "127.0.0.1",
    "--port",
    "3290",
    "--site-proxy-port",
    "3291",
    "--instance-name",
    name,
    "--instance-secret",
    secret,
    "--local-storage",
    resolve(root, "storage"),
    "--disable-beacon",
    resolve(root, "backend.sqlite"),
  ],
  { stdio: "inherit" },
);
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
