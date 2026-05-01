import { daytonaCallback } from "@convex-dev/daytona";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/daytona/callback",
  method: "POST",
  handler: httpAction(daytonaCallback()),
});

export default http;
