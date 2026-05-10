import { defineRemoteHandler } from "@convex-dev/remote-runner/entry";
import { summarizeString } from "../remoteHelpers.js";

export default defineRemoteHandler<{
  args: { text: string };
  returns: {
    filePreview: string;
    firstWord: string;
    length: number;
    node: string;
    upper: string;
    wordCount: number;
  };
}>(async (ctx, { text }) => {
  await ctx.fs.writeFile("input.txt", text);
  const node = await ctx.exec("node --version");
  const filePreview = await ctx.fs.readFile("input.txt", "utf8");
  const summary = summarizeString(filePreview);

  return {
    filePreview: filePreview.slice(0, 80),
    firstWord: summary.firstWord,
    length: summary.length,
    node: node.stdout.trim(),
    upper: summary.upper,
    wordCount: summary.wordCount,
  };
});
