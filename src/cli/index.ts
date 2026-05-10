#!/usr/bin/env node

import { build } from "esbuild";
import type { Plugin } from "esbuild";
import { promises as fs } from "node:fs";
import path from "node:path";

const forbiddenImports = new Set([
  "convex/server",
  "./_generated/server",
  "../_generated/server",
  "_generated/server",
]);

async function main() {
  const [command = "build", ...args] = process.argv.slice(2);
  if (command !== "build") {
    usage();
    process.exitCode = 1;
    return;
  }

  const options = parseBuildArgs(args);
  const root = path.resolve(options.root);
  const convexDir = path.resolve(root, options.convexDir);
  const outFile = path.resolve(convexDir, "remote/_generated/manifest.ts");
  const entries = await findEntries(convexDir);

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  if (entries.length === 0) {
    await fs.writeFile(outFile, renderManifest([]));
    console.log(`convex-remote-runner: wrote empty manifest to ${relative(root, outFile)}`);
    return;
  }

  const bundles = [];
  for (const entry of entries) {
    const name = bundleName(convexDir, entry);
    const entrypoint = `.convex-remote-runner/${name}.mjs`;
    const result = await build({
      absWorkingDir: root,
      bundle: true,
      entryPoints: [entry],
      format: "esm",
      logLevel: "silent",
      platform: "node",
      sourcemap: "inline",
      target: "node22",
      write: false,
      plugins: [remoteRunnerValidationPlugin(convexDir)],
    });
    const output = result.outputFiles[0]?.text;
    if (output === undefined) {
      throw new Error(`esbuild did not produce output for ${entry}`);
    }
    bundles.push({
      content: output,
      entrypoint,
      name,
      source: relative(root, entry),
    });
  }

  await fs.writeFile(outFile, renderManifest(bundles));
  console.log(
    `convex-remote-runner: bundled ${bundles.length} action${bundles.length === 1 ? "" : "s"} into ${relative(root, outFile)}`,
  );
}

function usage() {
  console.error(`Usage: convex-remote-runner build [--root .] [--convex-dir convex]`);
}

function parseBuildArgs(args: string[]) {
  const options = {
    convexDir: "convex",
    root: ".",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--root") {
      options.root = requiredValue(args, ++index, arg);
    } else if (arg === "--convex-dir") {
      options.convexDir = requiredValue(args, ++index, arg);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
}

function requiredValue(args: string[], index: number, flag: string) {
  const value = args[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

async function findEntries(convexDir: string) {
  const remoteDir = path.join(convexDir, "remote");
  const legacyDaytonaDir = path.join(convexDir, "daytona");
  const entries: string[] = [];
  await walk(remoteDir, entries).catch((error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  });
  if (entries.length === 0) {
    await walk(legacyDaytonaDir, entries).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    });
  }
  entries.sort();
  return entries.filter(
    (entry) =>
      !entry.endsWith(".d.ts") &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".spec.ts") &&
      (entry.endsWith(".ts") ||
        entry.endsWith(".tsx") ||
        entry.endsWith(".js") ||
        entry.endsWith(".mjs")),
  );
}

async function walk(dir: string, entries: string[]) {
  const children = await fs.readdir(dir, { withFileTypes: true });
  for (const child of children) {
    const fullPath = path.join(dir, child.name);
    if (child.isDirectory()) {
      if (child.name !== "_generated") {
        await walk(fullPath, entries);
      }
    } else if (child.isFile()) {
      entries.push(fullPath);
    }
  }
}

function remoteRunnerValidationPlugin(convexDir: string): Plugin {
  return {
    name: "convex-remote-runner-validation",
    setup(buildApi) {
      buildApi.onResolve(
        { filter: /^@convex-dev\/(?:remote-runner|daytona)\/entry$/ },
        () => ({
          namespace: "convex-remote-runner-entry",
          path: "entry",
        }),
      );
      buildApi.onLoad(
        { filter: /.*/, namespace: "convex-remote-runner-entry" },
        () => ({
          contents:
            "export function defineRemoteHandler(handler) { return handler; }",
          loader: "js",
        }),
      );
      buildApi.onResolve({ filter: /.*/ }, (args) => {
        const specifier = args.path;
        if (forbiddenImports.has(specifier) || specifier.endsWith("/_generated/server")) {
          return {
            errors: [
              {
                text: `Remote action modules cannot import '${specifier}'. Call Convex through ctx.queries, ctx.mutations, and ctx.actions instead.`,
              },
            ],
          };
        }
        if (
          specifier === "convex/server" ||
          specifier.includes("_generated/server") ||
          specifier.endsWith("_generated/api") ||
          specifier.endsWith("_generated/api.js")
        ) {
          return {
            errors: [
              {
                text: `Remote action modules cannot runtime-import '${specifier}'. Use type-only imports for FunctionReference types, then pass function handles to defineBundledAction.`,
              },
            ],
          };
        }
        if (specifier.startsWith(".") && args.importer) {
          const resolved = path.resolve(path.dirname(args.importer), specifier);
          const relativeToConvex = path.relative(convexDir, resolved);
          if (relativeToConvex.startsWith("..")) {
            return {
              errors: [
                {
                  text: `Remote action modules can only import local files from the Convex directory. '${specifier}' escapes ${convexDir}.`,
                },
              ],
            };
          }
        }
        return undefined;
      });
    },
  };
}

function bundleName(convexDir: string, entry: string) {
  const rootDir = entry.includes(`${path.sep}remote${path.sep}`)
    ? path.join(convexDir, "remote")
    : path.join(convexDir, "daytona");
  const parsed = path.parse(path.relative(rootDir, entry));
  const withoutExt = path.join(parsed.dir, parsed.name);
  return withoutExt.split(path.sep).join("_").replace(/[^A-Za-z0-9_$]/g, "_");
}

function renderManifest(
  bundles: Array<{
    content: string;
    entrypoint: string;
    name: string;
    source: string;
  }>,
) {
  const entries = bundles
    .map(
      (bundle) => `  ${JSON.stringify(bundle.name)}: {
    name: ${JSON.stringify(bundle.name)},
    entrypoint: ${JSON.stringify(bundle.entrypoint)},
    files: [
      {
        path: ${JSON.stringify(bundle.entrypoint)},
        content: ${JSON.stringify(bundle.content)},
      },
    ],
    source: ${JSON.stringify(bundle.source)},
  },`,
    )
    .join("\n");
  return `// Generated by convex-remote-runner build. Do not edit.
import type { RemoteBundleManifest } from "@convex-dev/remote-runner/entry";

export const bundles = {
${entries}
} satisfies RemoteBundleManifest;
`;
}

function relative(root: string, file: string) {
  return path.relative(root, file).split(path.sep).join("/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
