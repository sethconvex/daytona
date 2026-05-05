import type { DaytonaBundleManifest } from "@convex-dev/daytona/entry";

export const bundles = {
  getStringLength: {
    name: "getStringLength",
    entrypoint: ".convex-daytona/getStringLength.mjs",
    files: [
      {
        path: ".convex-daytona/getStringLength.mjs",
        content:
          "function defineDaytonaHandler(handler) { return handler; }\nfunction summarizeString(text) {\n  const words = text.trim() === \"\" ? [] : text.trim().split(/\\s+/);\n  return {\n    firstWord: words[0] ?? \"\",\n    length: text.length,\n    upper: text.toUpperCase(),\n    wordCount: words.length\n  };\n}\nvar getStringLength_default = defineDaytonaHandler(async (ctx, { text }) => {\n  await ctx.fs.writeFile(\"input.txt\", text);\n  const node = await ctx.exec(\"node --version\");\n  const filePreview = await ctx.fs.readFile(\"input.txt\", \"utf8\");\n  const summary = summarizeString(filePreview);\n  return {\n    filePreview: filePreview.slice(0, 80),\n    firstWord: summary.firstWord,\n    length: summary.length,\n    node: node.stdout.trim(),\n    upper: summary.upper,\n    wordCount: summary.wordCount\n  };\n});\nexport {\n  getStringLength_default as default\n};\n",
      },
    ],
    source: "convex/daytona/getStringLength.ts",
  },
} satisfies DaytonaBundleManifest;
