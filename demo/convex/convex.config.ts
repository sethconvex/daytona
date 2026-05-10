import remoteRunner from "@convex-dev/remote-runner/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(remoteRunner, { httpPrefix: "/remote-runner/" });

export default app;
