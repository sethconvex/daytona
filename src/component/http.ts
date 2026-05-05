import type { FunctionHandle } from "convex/server";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api.js";
import { httpAction } from "./_generated/server.js";

type DaytonaCallableType = "query" | "mutation" | "action";

const http = httpRouter();

http.route({
  path: "/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = parseBearerToken(request.headers.get("authorization"));
    if (!secret) {
      return jsonResponse(
        { ok: false, error: { message: "Missing callback secret." } },
        401,
      );
    }
    const authorized = await ctx.runQuery(internal.lib.validateCallbackSecret, {
      now: Date.now(),
      secret,
    });
    if (!authorized) {
      return jsonResponse(
        { ok: false, error: { message: "Unauthorized." } },
        401,
      );
    }

    let body: {
      args?: Record<string, unknown>;
      handle?: string;
      kind?: DaytonaCallableType;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse(
        {
          ok: false,
          error: { message: "Invalid JSON callback request." },
        },
        400,
      );
    }

    if (
      body.kind !== "query" &&
      body.kind !== "mutation" &&
      body.kind !== "action"
    ) {
      return jsonResponse(
        { ok: false, error: { message: "Invalid callback kind." } },
        400,
      );
    }
    if (typeof body.handle !== "string") {
      return jsonResponse(
        { ok: false, error: { message: "Missing callback function handle." } },
        400,
      );
    }

    try {
      const args = body.args ?? {};
      const value =
        body.kind === "query"
          ? await ctx.runQuery(
              body.handle as FunctionHandle<"query">,
              args as any,
            )
          : body.kind === "mutation"
            ? await ctx.runMutation(
                body.handle as FunctionHandle<"mutation">,
                args as any,
              )
            : await ctx.runAction(
                body.handle as FunctionHandle<"action">,
                args as any,
              );
      return jsonResponse({ ok: true, value: value ?? null }, 200);
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: serializeError(error),
        },
        500,
      );
    }
  }),
});

export default http;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function parseBearerToken(value: string | null) {
  const prefix = "Bearer ";
  return value?.startsWith(prefix) ? value.slice(prefix.length) : undefined;
}

function serializeError(error: unknown) {
  return {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
    stack: error instanceof Error ? error.stack : undefined,
  };
}
