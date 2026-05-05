import type { DaytonaBundleManifest } from "@convex-dev/daytona/entry";

export const bundles = {
  getStringLength: {
    name: "getStringLength",
    entrypoint: ".convex-daytona/getStringLength.mjs",
    files: [
      {
        path: ".convex-daytona/getStringLength.mjs",
        content:
          "function defineDaytonaHandler(handler) { return handler; }\nvar getStringLength_default = defineDaytonaHandler(async (ctx, { text }) => {\n  await ctx.fs.writeFile(\"input.txt\", text);\n  const node = await ctx.exec(\"node --version\");\n  const filePreview = await ctx.fs.readFile(\"input.txt\", \"utf8\");\n  return {\n    filePreview: filePreview.slice(0, 80),\n    length: text.length,\n    node: node.stdout.trim(),\n    upper: text.toUpperCase()\n  };\n});\nexport {\n  getStringLength_default as default\n};\n",
      },
    ],
    source: "convex/daytona/getStringLength.ts",
  },
} satisfies DaytonaBundleManifest;
