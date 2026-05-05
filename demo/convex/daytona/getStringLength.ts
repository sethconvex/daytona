import { defineDaytonaHandler } from "@convex-dev/daytona/entry";

export default defineDaytonaHandler<{
  args: { text: string };
  returns: {
    filePreview: string;
    length: number;
    node: string;
    upper: string;
  };
}>(async (ctx, { text }) => {
  await ctx.fs.writeFile("input.txt", text);
  const node = await ctx.exec("node --version");
  const filePreview = await ctx.fs.readFile("input.txt", "utf8");

  return {
    filePreview: filePreview.slice(0, 80),
    length: text.length,
    node: node.stdout.trim(),
    upper: text.toUpperCase(),
  };
});
