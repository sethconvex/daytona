import { defineDaytonaHandler } from "@convex-dev/daytona/entry";
import type { FunctionReference } from "convex/server";

export default defineDaytonaHandler<{
  args: { text: string };
  returns: {
    dbContext: string;
    length: number;
    node: string;
    upper: string;
  };
  queries: {
    getFact: FunctionReference<
      "query",
      "internal",
      { key: string },
      { key: string; value: string } | null
    >;
  };
}>(async (ctx, { text }) => {
  const fact = await ctx.queries.getFact({ key: "demoContext" });
  const node = await ctx.exec("node --version");

  return {
    dbContext: fact?.value ?? "No fact found.",
    length: text.length,
    node: node.stdout.trim(),
    upper: text.toUpperCase(),
  };
});
