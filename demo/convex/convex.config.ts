import daytona from "@convex-dev/daytona/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(daytona, { httpPrefix: "/daytona/" });

export default app;
