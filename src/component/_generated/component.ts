/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      cancelJob: FunctionReference<
        "mutation",
        "internal",
        { jobId: string; now?: number },
        null,
        Name
      >;
      cancelJobs: FunctionReference<
        "mutation",
        "internal",
        {
          beforeUpdatedAt?: number;
          cursor?: string | null;
          limit?: number;
          status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
        },
        {
          canceled: number;
          isDone: boolean;
          nextCursor: string | null;
          processed: number;
        },
        Name
      >;
      createSandbox: FunctionReference<
        "action",
        "internal",
        {
          auth: {
            apiKey?: string;
            apiUrl?: string;
            jwtToken?: string;
            organizationId?: string;
            provider?: "daytona" | "sprites";
            spritesApiUrl?: string;
            spritesToken?: string;
            target?: string;
          };
          create?: {
            autoArchiveInterval?: number;
            autoDeleteInterval?: number;
            autoStopInterval?: number;
            envVars?: Record<string, string>;
            ephemeral?: boolean;
            image?: string;
            labels?: Record<string, string>;
            language?: "python" | "typescript" | "javascript";
            name?: string;
            networkAllowList?: string;
            networkBlockAll?: boolean;
            public?: boolean;
            resources?: {
              cpu?: number;
              disk?: number;
              gpu?: number;
              memory?: number;
            };
            snapshot?: string;
            user?: string;
            volumes?: Array<{ mountPath: string; volumeId: string }>;
          };
          createTimeout?: number;
          files?: Array<{
            content: string;
            encoding?: "utf8" | "base64";
            mode?: string;
            path: string;
          }>;
          install?: {
            command?: string;
            manager?: "npm" | "pnpm" | "yarn";
            packages?: Array<string>;
          };
          seedDownloadUrl?: string;
        },
        {
          autoArchiveInterval?: number;
          autoDeleteInterval?: number;
          autoStopInterval?: number;
          createdAt?: string;
          disk?: number;
          id: string;
          labels?: Record<string, string>;
          memory?: number;
          name?: string;
          snapshot?: string;
          state?: string;
          target?: string;
          updatedAt?: string;
        },
        Name
      >;
      deleteSandbox: FunctionReference<
        "action",
        "internal",
        {
          auth: {
            apiKey?: string;
            apiUrl?: string;
            jwtToken?: string;
            organizationId?: string;
            provider?: "daytona" | "sprites";
            spritesApiUrl?: string;
            spritesToken?: string;
            target?: string;
          };
          sandboxId: string;
          timeout?: number;
        },
        null,
        Name
      >;
      getCleanup: FunctionReference<
        "query",
        "internal",
        { cleanupId: string },
        null | {
          batchSize: number;
          cancelCursor?: string | null;
          cancelOlderThan?: number;
          canceled: number;
          cleanupId: string;
          completedAt?: number;
          createdAt: number;
          deleteCursor?: string | null;
          deleteOlderThan?: number;
          deleted: number;
          error?: string;
          outputCursor?: string | null;
          outputDeleted: number;
          outputOlderThan?: number;
          processed: number;
          status: "running" | "succeeded" | "failed";
          updatedAt: number;
        },
        Name
      >;
      getJob: FunctionReference<
        "query",
        "internal",
        { jobId: string },
        null | {
          artifact?: {
            contentType: string;
            path: string;
            size: number;
            storageId?: string;
            uploadUrl?: string;
          };
          completedAt?: number;
          createdAt: number;
          durationMs?: number;
          error?: string;
          exitCode?: number;
          jobId: string;
          sandboxId?: string;
          startedAt?: number;
          status: "queued" | "running" | "succeeded" | "failed" | "canceled";
          updatedAt: number;
        },
        Name
      >;
      getSandbox: FunctionReference<
        "action",
        "internal",
        {
          auth: {
            apiKey?: string;
            apiUrl?: string;
            jwtToken?: string;
            organizationId?: string;
            provider?: "daytona" | "sprites";
            spritesApiUrl?: string;
            spritesToken?: string;
            target?: string;
          };
          sandboxId: string;
        },
        {
          autoArchiveInterval?: number;
          autoDeleteInterval?: number;
          autoStopInterval?: number;
          createdAt?: string;
          disk?: number;
          id: string;
          labels?: Record<string, string>;
          memory?: number;
          name?: string;
          snapshot?: string;
          state?: string;
          target?: string;
          updatedAt?: string;
        },
        Name
      >;
      listJobOutput: FunctionReference<
        "query",
        "internal",
        { afterSequence?: number; jobId: string; limit?: number },
        {
          isDone: boolean;
          nextSequence: number | null;
          output: Array<{
            content: string;
            createdAt: number;
            jobId: string;
            outputId: string;
            runId: string;
            sandboxId: string;
            sequence: number;
            stream: "stdout" | "stderr";
          }>;
        },
        Name
      >;
      listJobs: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string | null;
          limit?: number;
          status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
        },
        {
          isDone: boolean;
          jobs: Array<{
            artifact?: {
              contentType: string;
              path: string;
              size: number;
              storageId?: string;
              uploadUrl?: string;
            };
            completedAt?: number;
            createdAt: number;
            durationMs?: number;
            error?: string;
            exitCode?: number;
            jobId: string;
            sandboxId?: string;
            startedAt?: number;
            status: "queued" | "running" | "succeeded" | "failed" | "canceled";
            updatedAt: number;
          }>;
          nextCursor: string | null;
        },
        Name
      >;
      registerCallbackSecret: FunctionReference<
        "mutation",
        "internal",
        { capabilities?: Array<string>; expiresAt: number; secret: string },
        null,
        Name
      >;
      runCode: FunctionReference<
        "action",
        "internal",
        {
          argv?: Array<string>;
          auth: {
            apiKey?: string;
            apiUrl?: string;
            jwtToken?: string;
            organizationId?: string;
            provider?: "daytona" | "sprites";
            spritesApiUrl?: string;
            spritesToken?: string;
            target?: string;
          };
          code: string;
          create?: {
            autoArchiveInterval?: number;
            autoDeleteInterval?: number;
            autoStopInterval?: number;
            envVars?: Record<string, string>;
            ephemeral?: boolean;
            image?: string;
            labels?: Record<string, string>;
            language?: "python" | "typescript" | "javascript";
            name?: string;
            networkAllowList?: string;
            networkBlockAll?: boolean;
            public?: boolean;
            resources?: {
              cpu?: number;
              disk?: number;
              gpu?: number;
              memory?: number;
            };
            snapshot?: string;
            user?: string;
            volumes?: Array<{ mountPath: string; volumeId: string }>;
          };
          createTimeout?: number;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          language?: "python" | "typescript" | "javascript";
          sandboxId?: string;
          timeout?: number;
        },
        {
          artifact?: {
            contentType: string;
            path: string;
            size: number;
            storageId?: string;
            uploadUrl?: string;
          };
          callbackSecret?: string;
          createdSandbox: boolean;
          deletedSandbox: boolean;
          durationMs: number;
          result: {
            artifacts?: { charts?: Array<any>; stdout: string };
            exitCode: number;
            result: string;
            stderr?: string;
          };
          sandbox: {
            autoArchiveInterval?: number;
            autoDeleteInterval?: number;
            autoStopInterval?: number;
            createdAt?: string;
            disk?: number;
            id: string;
            labels?: Record<string, string>;
            memory?: number;
            name?: string;
            snapshot?: string;
            state?: string;
            target?: string;
            updatedAt?: string;
          };
        },
        Name
      >;
      runCommand: FunctionReference<
        "action",
        "internal",
        {
          auth: {
            apiKey?: string;
            apiUrl?: string;
            jwtToken?: string;
            organizationId?: string;
            provider?: "daytona" | "sprites";
            spritesApiUrl?: string;
            spritesToken?: string;
            target?: string;
          };
          callback?: { envName?: string; secret?: "mint" | string };
          capture?: {
            maxBytes?: number;
            onArtifact?: string;
            path: string;
            uploadUrl?: string;
          };
          command: string;
          create?: {
            autoArchiveInterval?: number;
            autoDeleteInterval?: number;
            autoStopInterval?: number;
            envVars?: Record<string, string>;
            ephemeral?: boolean;
            image?: string;
            labels?: Record<string, string>;
            language?: "python" | "typescript" | "javascript";
            name?: string;
            networkAllowList?: string;
            networkBlockAll?: boolean;
            public?: boolean;
            resources?: {
              cpu?: number;
              disk?: number;
              gpu?: number;
              memory?: number;
            };
            snapshot?: string;
            user?: string;
            volumes?: Array<{ mountPath: string; volumeId: string }>;
          };
          createTimeout?: number;
          cwd?: string;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          files?: Array<{
            content: string;
            encoding?: "utf8" | "base64";
            mode?: string;
            path: string;
          }>;
          install?: {
            command?: string;
            manager?: "npm" | "pnpm" | "yarn";
            packages?: Array<string>;
          };
          output?: {
            lineBuffered?: boolean;
            onOutput?: string;
            redact?: {
              env?: Array<string>;
              patterns?: Array<string>;
              values?: Array<string>;
            };
          };
          sandbox?: {
            create?: {
              autoArchiveInterval?: number;
              autoDeleteInterval?: number;
              autoStopInterval?: number;
              envVars?: Record<string, string>;
              ephemeral?: boolean;
              image?: string;
              labels?: Record<string, string>;
              language?: "python" | "typescript" | "javascript";
              name?: string;
              networkAllowList?: string;
              networkBlockAll?: boolean;
              public?: boolean;
              resources?: {
                cpu?: number;
                disk?: number;
                gpu?: number;
                memory?: number;
              };
              snapshot?: string;
              user?: string;
              volumes?: Array<{ mountPath: string; volumeId: string }>;
            };
            deleteAfter?: boolean;
            files?: Array<{
              content: string;
              encoding?: "utf8" | "base64";
              mode?: string;
              path: string;
            }>;
            id?: string;
            seedDownloadUrl?: string;
          };
          sandboxId?: string;
          seedDownloadUrl?: string;
          timeout?: number;
        },
        {
          artifact?: {
            contentType: string;
            path: string;
            size: number;
            storageId?: string;
            uploadUrl?: string;
          };
          callbackSecret?: string;
          createdSandbox: boolean;
          deletedSandbox: boolean;
          durationMs: number;
          result: {
            artifacts?: { charts?: Array<any>; stdout: string };
            exitCode: number;
            result: string;
            stderr?: string;
          };
          sandbox: {
            autoArchiveInterval?: number;
            autoDeleteInterval?: number;
            autoStopInterval?: number;
            createdAt?: string;
            disk?: number;
            id: string;
            labels?: Record<string, string>;
            memory?: number;
            name?: string;
            snapshot?: string;
            state?: string;
            target?: string;
            updatedAt?: string;
          };
        },
        Name
      >;
      startCleanup: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cancelActiveOlderThanMs?: number;
          deleteCompletedOlderThanMs?: number;
        },
        { cleanupId: string },
        Name
      >;
      startCommand: FunctionReference<
        "action",
        "internal",
        {
          auth: {
            apiKey?: string;
            apiUrl?: string;
            jwtToken?: string;
            organizationId?: string;
            provider?: "daytona" | "sprites";
            spritesApiUrl?: string;
            spritesToken?: string;
            target?: string;
          };
          callback?: { envName?: string; secret?: "mint" | string };
          capture?: {
            maxBytes?: number;
            onArtifact?: string;
            path: string;
            uploadUrl?: string;
          };
          command: string;
          create?: {
            autoArchiveInterval?: number;
            autoDeleteInterval?: number;
            autoStopInterval?: number;
            envVars?: Record<string, string>;
            ephemeral?: boolean;
            image?: string;
            labels?: Record<string, string>;
            language?: "python" | "typescript" | "javascript";
            name?: string;
            networkAllowList?: string;
            networkBlockAll?: boolean;
            public?: boolean;
            resources?: {
              cpu?: number;
              disk?: number;
              gpu?: number;
              memory?: number;
            };
            snapshot?: string;
            user?: string;
            volumes?: Array<{ mountPath: string; volumeId: string }>;
          };
          createTimeout?: number;
          cwd?: string;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          files?: Array<{
            content: string;
            encoding?: "utf8" | "base64";
            mode?: string;
            path: string;
          }>;
          install?: {
            command?: string;
            manager?: "npm" | "pnpm" | "yarn";
            packages?: Array<string>;
          };
          output?: {
            lineBuffered?: boolean;
            onOutput?: string;
            redact?: {
              env?: Array<string>;
              patterns?: Array<string>;
              values?: Array<string>;
            };
          };
          sandbox?: {
            create?: {
              autoArchiveInterval?: number;
              autoDeleteInterval?: number;
              autoStopInterval?: number;
              envVars?: Record<string, string>;
              ephemeral?: boolean;
              image?: string;
              labels?: Record<string, string>;
              language?: "python" | "typescript" | "javascript";
              name?: string;
              networkAllowList?: string;
              networkBlockAll?: boolean;
              public?: boolean;
              resources?: {
                cpu?: number;
                disk?: number;
                gpu?: number;
                memory?: number;
              };
              snapshot?: string;
              user?: string;
              volumes?: Array<{ mountPath: string; volumeId: string }>;
            };
            deleteAfter?: boolean;
            files?: Array<{
              content: string;
              encoding?: "utf8" | "base64";
              mode?: string;
              path: string;
            }>;
            id?: string;
            seedDownloadUrl?: string;
          };
          sandboxId?: string;
          seedDownloadUrl?: string;
          timeout?: number;
        },
        { jobId: string },
        Name
      >;
    };
    sandboxes: {
      acquireTool: FunctionReference<
        "mutation",
        "internal",
        { id: string; token: string },
        boolean,
        Name
      >;
      artifactText: FunctionReference<
        "action",
        "internal",
        { id: string; maxBytes: number },
        string,
        Name
      >;
      artifactUrl: FunctionReference<
        "query",
        "internal",
        { id: string },
        string | null,
        Name
      >;
      cancel: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        null,
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        { config: string; threadKey?: string },
        string,
        Name
      >;
      getArtifact: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getForThread: FunctionReference<
        "query",
        "internal",
        { threadKey: string },
        any,
        Name
      >;
      getRun: FunctionReference<
        "query",
        "internal",
        { runId: string },
        any,
        Name
      >;
      getWorkspace: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      operate: FunctionReference<
        "action",
        "internal",
        {
          body: string;
          id: string;
          operation: "read" | "write" | "suspend" | "destroy";
          service: { token: string; url: string };
        },
        any,
        Name
      >;
      releaseTool: FunctionReference<
        "mutation",
        "internal",
        { id: string; token: string },
        null,
        Name
      >;
      start: FunctionReference<
        "mutation",
        "internal",
        {
          agentToken?: string;
          config?: string;
          job: string;
          requestId: string;
          sandboxId?: string;
          service: { token: string; url: string };
        },
        string,
        Name
      >;
      taskCancel: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        null,
        Name
      >;
      taskStart: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            config?: string;
            job: string;
            sandboxId?: string;
            service: { token: string; url: string };
          };
          context: any;
          name: string;
          onFailure: string;
          onSuccess: string;
          taskStack?: Array<any>;
        },
        { cancel: string; id: string },
        Name
      >;
      templateOperation: FunctionReference<
        "action",
        "internal",
        {
          id?: string;
          operation: "build" | "get";
          service: { token: string; url: string };
          spec?: string;
        },
        any,
        Name
      >;
    };
  };
