import {
  anyApi,
  createFunctionHandle,
  type FunctionHandle,
} from "convex/server";
import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import {
  configSchema,
  jobSchema,
  durationMs,
  MAX_ARTIFACT_BYTES,
  MAX_FILE_BYTES,
  PREVIEW_BYTES,
} from "../sandbox/types.js";
import {
  resultValidator,
  sandboxState,
  serviceValidator,
} from "./sandboxValidators.js";
const refs = anyApi.sandboxes;

export const create = mutation({
  args: { config: v.string(), threadKey: v.optional(v.string()) },
  returns: v.id("workspaces"),
  handler: async (ctx, args) => {
    const config = configSchema.parse(JSON.parse(args.config));
    if (args.threadKey) {
      const existing = await ctx.db
        .query("workspaces")
        .withIndex("by_threadKey", (q) => q.eq("threadKey", args.threadKey))
        .unique();
      if (
        existing &&
        existing.expiresAt > Date.now() &&
        !["expired", "destroyed"].includes(existing.state)
      )
        return existing._id;
      if (existing) await ctx.db.patch(existing._id, { threadKey: undefined });
    }
    return ctx.db.insert("workspaces", {
      config: JSON.stringify(config),
      state: "pending",
      expiresAt: Date.now() + durationMs(config.retention),
      threadKey: args.threadKey,
    });
  },
});
export const getWorkspace = query({
  args: { id: v.id("workspaces") },
  returns: v.any(),
  handler: async (ctx, args) => ctx.db.get(args.id),
});
export const getForThread = query({
  args: { threadKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) =>
    ctx.db
      .query("workspaces")
      .withIndex("by_threadKey", (q) => q.eq("threadKey", args.threadKey))
      .unique(),
});
export const start = mutation({
  args: {
    sandboxId: v.optional(v.id("workspaces")),
    config: v.optional(v.string()),
    job: v.string(),
    requestId: v.string(),
    service: serviceValidator,
    agentToken: v.optional(v.string()),
  },
  returns: v.id("runs"),
  handler: async (ctx, args) => {
    if (args.requestId.length < 1 || args.requestId.length > 200)
      throw new Error("Invalid requestId.");
    const job = jobSchema.parse(JSON.parse(args.job));
    durationMs(job.timeout);
    durationMs(job.artifactRetention);
    const fingerprint = JSON.stringify([
      args.sandboxId ?? null,
      args.config ?? null,
      job,
    ]);
    const existing = await ctx.db
      .query("runs")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new Error("requestId already identifies different work.");
      return existing._id;
    }
    let sandboxId = args.sandboxId;
    if (sandboxId) {
      const ws = await ctx.db.get(sandboxId);
      if (
        !ws ||
        ws.expiresAt <= Date.now() ||
        ["destroyed", "expired"].includes(ws.state)
      )
        throw new Error("Workspace expired or missing.");
      if (args.agentToken && ws.toolToken !== args.agentToken)
        throw new Error("Agent operation lease expired.");
    } else {
      const config = configSchema.parse(JSON.parse(args.config ?? "{}"));
      sandboxId = await ctx.db.insert("workspaces", {
        config: JSON.stringify(config),
        state: "pending",
        expiresAt: Date.now() + durationMs(config.retention),
      });
    }
    const runId = await ctx.db.insert("runs", {
      sandboxId,
      job: JSON.stringify(job),
      requestId: args.requestId,
      fingerprint,
      temporary: args.sandboxId === undefined,
      status: "queued",
      cancelRequested: false,
      finalized: false,
    });
    if (args.agentToken) await ctx.db.patch(sandboxId, { agentRunId: runId });
    // Acceptance and scheduling commit together.
    await ctx.scheduler.runAfter(0, refs.reconcile, {
      runId,
      service: args.service,
    });
    return runId;
  },
});
export const getRun = query({
  args: { runId: v.id("runs") },
  returns: v.any(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) return null;
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_runId_path", (q) => q.eq("runId", runId))
      .take(22);
    return {
      runId: run._id,
      sandboxId: run.sandboxId,
      status: run.status,
      finalized: run.finalized,
      cancelRequested: run.cancelRequested,
      result: run.result,
      error: run.error,
      delivery: run.delivery,
      artifacts: artifacts.map((a) => ({ path: a.path, artifactId: a._id })),
    };
  },
});
export const cancel = mutation({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (run && !run.finalized)
      await ctx.db.patch(args.runId, { cancelRequested: true });
    return null;
  },
});
export const execution = internalQuery({
  args: { runId: v.id("runs") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    return run ? { run, workspace: await ctx.db.get(run.sandboxId) } : null;
  },
});
export const update = internalMutation({
  args: {
    runId: v.id("runs"),
    result: v.optional(resultValidator),
    error: v.optional(v.string()),
    finalized: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.finalized) return null;
    const { runId, ...patch } = args;
    await ctx.db.patch(runId, {
      ...patch,
      ...(args.result ? { status: args.result.status } : {}),
    });
    if (args.finalized && run.taskCallbacks) {
      await ctx.scheduler.runAfter(0, refs.deliverTask, { runId });
      await ctx.scheduler.runAfter(600_000, refs.deliveryDeadline, { runId });
    }
    return null;
  },
});
export const setWorkspaceState = internalMutation({
  args: { id: v.id("workspaces"), state: sandboxState },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { state: args.state });
    return null;
  },
});
export async function serviceRequest(
  service: { url: string; token: string },
  path: string,
  body?: unknown,
): Promise<any> {
  const url = new URL(service.url);
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("Sandbox service requires HTTPS.");
  const response = await fetch(service.url.replace(/\/$/, "") + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      authorization: `Bearer ${service.token}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(90_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Sandbox service ${response.status}: ${(await response.text()).slice(0, 1000)}`,
    );
  return response.json();
}
export const claim = internalMutation({
  args: { runId: v.id("runs"), service: serviceValidator, token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.finalized) return false;
    await ctx.scheduler.runAfter(5000, refs.reconcile, {
      runId: args.runId,
      service: args.service,
    });
    if ((run.leaseUntil ?? 0) > Date.now()) return false;
    await ctx.db.patch(args.runId, {
      leaseUntil: Date.now() + 600_000,
      leaseToken: args.token,
    });
    return true;
  },
});
export const release = internalMutation({
  args: { runId: v.id("runs"), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (run?.leaseToken === args.token)
      await ctx.db.patch(args.runId, { leaseUntil: 0, leaseToken: undefined });
    return null;
  },
});
export const reconcile = internalAction({
  args: { runId: v.id("runs"), service: serviceValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();
    if (!(await ctx.runMutation(refs.claim, { ...args, token }))) return null;
    const record = await ctx.runQuery(refs.execution, { runId: args.runId });
    if (!record || record.run.finalized) return null;
    // claim scheduled the next observation atomically before any external IO.
    const { run, workspace } = record;
    try {
      const config = JSON.parse(workspace.config);
      await serviceRequest(args.service, `/workspaces/${run.sandboxId}`, {
        config,
      });
      const job = JSON.parse(run.job);
      await serviceRequest(args.service, `/runs/${args.runId}`, {
        workspaceId: run.sandboxId,
        job,
      });
      if (run.cancelRequested)
        await serviceRequest(args.service, `/runs/${args.runId}/cancel`, {});
      const remote = await serviceRequest(args.service, `/runs/${args.runId}`);
      const result = {
        status: remote.status,
        exitCode: remote.exitCode,
        durationMs: remote.durationMs,
        stdout: remote.stdout,
        stderr: remote.stderr,
        ...(remote.error ? { error: remote.error.slice(0, 2000) } : {}),
      };
      if (["queued", "running"].includes(remote.status)) {
        await ctx.runMutation(refs.update, { runId: args.runId, result });
        return null;
      }
      let exportError: string | undefined;
      try {
        const outputs = [...(job.outputs ?? [])];
        if (job.exportLogs)
          outputs.push(
            `/tmp/convex-sandbox/${args.runId}/stdout`,
            `/tmp/convex-sandbox/${args.runId}/stderr`,
          );
        for (const path of new Set<string>(outputs)) {
          const existing = await ctx.runQuery(refs.findArtifact, {
            runId: args.runId,
            path,
          });
          if (existing) continue;
          const uploadUrl = await ctx.storage.generateUploadUrl();
          const file = await serviceRequest(
            args.service,
            `/workspaces/${run.sandboxId}/export`,
            { path, maxBytes: MAX_ARTIFACT_BYTES, uploadUrl },
          );
          await ctx.runMutation(refs.recordArtifact, {
            runId: args.runId,
            path,
            storageId: file.storageId,
            size: file.size,
            preview: file.preview,
            expiresAt: Date.now() + durationMs(job.artifactRetention),
          });
          return null; // Export one artifact per bounded Action.
        }
      } catch (error) {
        exportError = error instanceof Error ? error.message : String(error);
      }
      if (exportError) {
        result.status = "failed";
        result.error = exportError.slice(0, 2000);
      }
      if (run.temporary) {
        await serviceRequest(
          args.service,
          `/workspaces/${run.sandboxId}/destroy`,
          {},
        );
        await ctx.runMutation(refs.setWorkspaceState, {
          id: run.sandboxId,
          state: "destroyed",
        });
        delete result.stdout.outputPath;
        delete result.stderr.outputPath;
      }
      await ctx.runMutation(refs.update, {
        runId: args.runId,
        result,
        finalized: true,
      });
    } catch (error) {
      await ctx.runMutation(refs.update, {
        runId: args.runId,
        error: (error instanceof Error ? error.message : String(error)).slice(
          0,
          2000,
        ),
      });
    } finally {
      await ctx.runMutation(refs.release, { runId: args.runId, token });
    }
    return null;
  },
});
export const findArtifact = internalQuery({
  args: { runId: v.id("runs"), path: v.string() },
  returns: v.any(),
  handler: async (ctx, args) =>
    ctx.db
      .query("artifacts")
      .withIndex("by_runId_path", (q) =>
        q.eq("runId", args.runId).eq("path", args.path),
      )
      .unique(),
});
export const recordArtifact = internalMutation({
  args: {
    runId: v.id("runs"),
    path: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    preview: v.string(),
    expiresAt: v.number(),
  },
  returns: v.id("artifacts"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("artifacts")
      .withIndex("by_runId_path", (q) =>
        q.eq("runId", args.runId).eq("path", args.path),
      )
      .unique();
    if (existing) {
      await ctx.storage.delete(args.storageId);
      return existing._id;
    }
    const id = await ctx.db.insert("artifacts", args);
    await ctx.scheduler.runAt(args.expiresAt, refs.expireArtifact, { id });
    return id;
  },
});
export const expireArtifact = internalMutation({
  args: { id: v.id("artifacts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.id);
    if (artifact && artifact.expiresAt <= Date.now()) {
      await ctx.storage.delete(artifact.storageId);
      await ctx.db.delete(args.id);
    }
    return null;
  },
});
export const getArtifact = query({
  args: { id: v.id("artifacts") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.id);
    return artifact && artifact.expiresAt > Date.now() ? artifact : null;
  },
});
export const artifactUrl = query({
  args: { id: v.id("artifacts") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.id);
    return artifact && artifact.expiresAt > Date.now()
      ? ctx.storage.getUrl(artifact.storageId)
      : null;
  },
});
export const artifactText = action({
  args: { id: v.id("artifacts"), maxBytes: v.number() },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (
      !Number.isInteger(args.maxBytes) ||
      args.maxBytes < 1 ||
      args.maxBytes > MAX_FILE_BYTES
    )
      throw new Error("Invalid text limit.");
    const artifact = await ctx.runQuery(refs.getArtifact, { id: args.id });
    if (!artifact || artifact.size > args.maxBytes)
      throw new Error("Artifact missing, expired, or exceeds text limit.");
    const blob = await ctx.storage.get(artifact.storageId);
    if (!blob) throw new Error("Artifact missing.");
    return blob.text();
  },
});
export const operate = action({
  args: {
    id: v.id("workspaces"),
    operation: v.union(
      v.literal("read"),
      v.literal("write"),
      v.literal("suspend"),
      v.literal("destroy"),
    ),
    body: v.string(),
    service: serviceValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ws = await ctx.runQuery(refs.getWorkspace, { id: args.id });
    if (
      !ws ||
      ws.expiresAt <= Date.now() ||
      ["destroyed", "expired"].includes(ws.state)
    )
      throw new Error("Workspace expired or missing.");
    await serviceRequest(args.service, `/workspaces/${args.id}`, {
      config: JSON.parse(ws.config),
    });
    const result = await serviceRequest(
      args.service,
      `/workspaces/${args.id}/${args.operation}`,
      JSON.parse(args.body),
    );
    const state =
      args.operation === "destroy"
        ? "destroyed"
        : args.operation === "suspend"
          ? "suspended"
          : "ready";
    await ctx.runMutation(refs.setWorkspaceState, { id: args.id, state });
    return result;
  },
});

export const templateOperation = action({
  args: {
    operation: v.union(v.literal("build"), v.literal("get")),
    id: v.optional(v.string()),
    spec: v.optional(v.string()),
    service: serviceValidator,
  },
  returns: v.any(),
  handler: async (_ctx, args) =>
    args.operation === "build"
      ? serviceRequest(
          args.service,
          "/templates/build",
          JSON.parse(args.spec ?? "{}"),
        )
      : serviceRequest(
          args.service,
          `/templates/${encodeURIComponent(args.id ?? "")}`,
        ),
});

export const acquireTool = mutation({
  args: { id: v.id("workspaces"), token: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const ws = await ctx.db.get(args.id);
    if (
      !ws ||
      ws.expiresAt <= Date.now() ||
      ["expired", "destroyed"].includes(ws.state)
    )
      throw new Error("Workspace expired.");
    if ((ws.toolLeaseUntil ?? 0) > Date.now()) return false;
    if (ws.agentRunId) {
      const previous = await ctx.db.get(ws.agentRunId);
      if (previous && !previous.finalized) return false;
    }
    await ctx.db.patch(args.id, {
      toolToken: args.token,
      toolLeaseUntil: Date.now() + 600_000,
    });
    return true;
  },
});
export const releaseTool = mutation({
  args: { id: v.id("workspaces"), token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ws = await ctx.db.get(args.id);
    if (ws?.toolToken === args.token)
      await ctx.db.patch(args.id, { toolToken: undefined, toolLeaseUntil: 0 });
    return null;
  },
});

export const taskStart = mutation({
  args: {
    name: v.string(),
    config: v.object({
      sandboxId: v.optional(v.id("workspaces")),
      config: v.optional(v.string()),
      job: v.string(),
      service: serviceValidator,
    }),
    taskStack: v.optional(v.array(v.any())),
    onSuccess: v.string(),
    onFailure: v.string(),
    context: v.any(),
  },
  returns: v.object({ id: v.string(), cancel: v.string() }),
  handler: async (ctx, args) => {
    if (args.taskStack?.length)
      throw new Error("Sandbox is a leaf task and cannot wrap nested tasks.");
    const runId = await ctx.runMutation(refs.start, {
      ...args.config,
      requestId: crypto.randomUUID(),
    });
    await ctx.db.patch(runId, {
      taskCallbacks: {
        onSuccess: args.onSuccess,
        onFailure: args.onFailure,
        context: args.context,
      },
    });
    return { id: runId, cancel: await createFunctionHandle(refs.taskCancel) };
  },
});
export const taskCancel = mutation({
  args: { id: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(refs.cancel, { runId: args.id });
    return null;
  },
});
export const beginDelivery = internalMutation({
  args: { runId: v.id("runs") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.finalized || !run.taskCallbacks || run.delivery) return false;
    await ctx.db.patch(args.runId, { delivery: "delivering" });
    // If the dispatcher crashes, failure still gets one durably scheduled attempt.
    await ctx.scheduler.runAfter(600_000, refs.taskFailure, {
      runId: args.runId,
      error: "Success callback did not commit before its delivery deadline.",
    });
    return true;
  },
});
export const deliverTask = internalAction({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await ctx.runMutation(refs.beginDelivery, args))) return null;
    try {
      await ctx.runMutation(refs.taskSuccess, args);
    } catch (error) {
      await ctx.runMutation(refs.taskFailure, {
        ...args,
        error: (error instanceof Error ? error.message : String(error)).slice(
          0,
          2000,
        ),
      });
    }
    return null;
  },
});
export const taskSuccess = internalMutation({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.taskCallbacks || run.delivery !== "delivering") return null;
    if (run.status === "failed" || run.status === "cancelled")
      throw new Error(run.result?.error ?? run.status);
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_runId_path", (q) => q.eq("runId", args.runId))
      .take(22);
    await ctx.runMutation(
      run.taskCallbacks.onSuccess as FunctionHandle<"mutation">,
      {
        id: args.runId,
        context: run.taskCallbacks.context,
        result: {
          kind: "success",
          returnValue: {
            ...run.result,
            runId: args.runId,
            artifacts: artifacts.map((a) => ({
              path: a.path,
              artifactId: a._id,
            })),
          },
        },
      },
    );
    await ctx.db.patch(args.runId, { delivery: "succeeded" });
    return null;
  },
});
export const taskFailure = internalMutation({
  args: { runId: v.id("runs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.taskCallbacks || run.delivery !== "delivering") return null;
    const scheduledId = await ctx.scheduler.runAfter(
      0,
      refs.invokeTaskFailure,
      args,
    );
    await ctx.db.patch(args.runId, {
      delivery: "failureScheduled",
      failureScheduledId: scheduledId,
    });
    return null;
  },
});
export const invokeTaskFailure = internalMutation({
  args: { runId: v.id("runs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run?.taskCallbacks || run.delivery !== "failureScheduled") return null;
    await ctx.runMutation(
      run.taskCallbacks.onFailure as FunctionHandle<"mutation">,
      {
        id: args.runId,
        context: run.taskCallbacks.context,
        result:
          run.status === "cancelled"
            ? { kind: "canceled" }
            : { kind: "failed", error: args.error },
      },
    );
    await ctx.db.patch(args.runId, { delivery: "failed" });
    return null;
  },
});

export const deliveryDeadline = internalMutation({
  args: { runId: v.id("runs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (
      !run?.taskCallbacks ||
      !run.finalized ||
      (run.delivery && run.delivery !== "delivering")
    )
      return null;
    await ctx.db.patch(args.runId, { delivery: "delivering" });
    await ctx.runMutation(refs.taskFailure, {
      ...args,
      error:
        "Task callback dispatcher did not commit before its delivery deadline.",
    });
    return null;
  },
});
