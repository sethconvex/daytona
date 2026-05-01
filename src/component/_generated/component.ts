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

type DaytonaAuth = {
  apiKey?: string;
  apiUrl?: string;
  jwtToken?: string;
  organizationId?: string;
  target?: string;
};

type SandboxLanguage = "python" | "typescript" | "javascript";

type SandboxResources = {
  cpu?: number;
  gpu?: number;
  memory?: number;
  disk?: number;
};

type VolumeMount = {
  volumeId: string;
  mountPath: string;
};

type CreateSandboxOptions = {
  autoArchiveInterval?: number;
  autoDeleteInterval?: number;
  autoStopInterval?: number;
  envVars?: Record<string, string>;
  ephemeral?: boolean;
  image?: string;
  labels?: Record<string, string>;
  language?: SandboxLanguage;
  name?: string;
  networkAllowList?: string;
  networkBlockAll?: boolean;
  public?: boolean;
  resources?: SandboxResources;
  snapshot?: string;
  user?: string;
  volumes?: VolumeMount[];
};

type DaytonaStagedFile = {
  content: string;
  encoding?: "utf8" | "base64";
  mode?: string;
  path: string;
};

type DaytonaPackageInstall = {
  command?: string;
  manager?: "npm" | "pnpm" | "yarn";
  packages?: string[];
};

type DaytonaCommandSandbox = {
  create?: CreateSandboxOptions;
  deleteAfter?: boolean;
  files?: DaytonaStagedFile[];
  id?: string;
  seedDownloadUrl?: string;
};

type DaytonaCommandOutput = {
  lineBuffered?: boolean;
  onOutput?: string;
};

type DaytonaCommandCapture = {
  onArtifact?: string;
  path: string;
  uploadUrl?: string;
};

type DaytonaCommandCallback = {
  envName?: string;
  secret?: "mint" | string;
};

type SandboxSummary = {
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

type ExecuteResult = {
  artifacts?: {
    charts?: any[];
    stdout: string;
  };
  exitCode: number;
  result: string;
  stderr?: string;
};

type DaytonaArtifact = {
  contentType: string;
  path: string;
  size: number;
  storageId?: string;
  uploadUrl?: string;
};

type RunResult = {
  artifact?: DaytonaArtifact;
  callbackSecret?: string;
  createdSandbox: boolean;
  deletedSandbox: boolean;
  durationMs: number;
  result: ExecuteResult;
  sandbox: SandboxSummary;
};

type DaytonaJob = {
  artifact?: DaytonaArtifact;
  completedAt?: number;
  createdAt: number;
  durationMs?: number;
  error?: string;
  exitCode?: number;
  jobId: string;
  output: string;
  sandboxId?: string;
  startedAt?: number;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  updatedAt: number;
};

/**
 * A utility for referencing a Convex component's exposed API.
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      createSandbox: FunctionReference<
        "action",
        "internal",
        {
          auth: DaytonaAuth;
          create?: CreateSandboxOptions;
          createTimeout?: number;
          files?: DaytonaStagedFile[];
          install?: DaytonaPackageInstall;
          seedDownloadUrl?: string;
        },
        SandboxSummary,
        Name
      >;
      deleteSandbox: FunctionReference<
        "action",
        "internal",
        {
          auth: DaytonaAuth;
          sandboxId: string;
          timeout?: number;
        },
        null,
        Name
      >;
      getSandbox: FunctionReference<
        "action",
        "internal",
        {
          auth: DaytonaAuth;
          sandboxId: string;
        },
        SandboxSummary,
        Name
      >;
      runCommand: FunctionReference<
        "action",
        "internal",
        {
          auth: DaytonaAuth;
          callback?: DaytonaCommandCallback;
          capture?: DaytonaCommandCapture;
          command: string;
          create?: CreateSandboxOptions;
          createTimeout?: number;
          cwd?: string;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          files?: DaytonaStagedFile[];
          install?: DaytonaPackageInstall;
          output?: DaytonaCommandOutput;
          sandbox?: DaytonaCommandSandbox;
          sandboxId?: string;
          seedDownloadUrl?: string;
          timeout?: number;
        },
        RunResult,
        Name
      >;
      startCommand: FunctionReference<
        "action",
        "internal",
        {
          auth: DaytonaAuth;
          callback?: DaytonaCommandCallback;
          capture?: DaytonaCommandCapture;
          command: string;
          create?: CreateSandboxOptions;
          createTimeout?: number;
          cwd?: string;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          files?: DaytonaStagedFile[];
          install?: DaytonaPackageInstall;
          output?: DaytonaCommandOutput;
          sandbox?: DaytonaCommandSandbox;
          sandboxId?: string;
          seedDownloadUrl?: string;
          timeout?: number;
        },
        { jobId: string },
        Name
      >;
      getJob: FunctionReference<
        "query",
        "internal",
        { jobId: string },
        DaytonaJob | null,
        Name
      >;
      cancelJob: FunctionReference<
        "mutation",
        "internal",
        { jobId: string; now?: number },
        null,
        Name
      >;
      runCode: FunctionReference<
        "action",
        "internal",
        {
          auth: DaytonaAuth;
          argv?: string[];
          code: string;
          create?: CreateSandboxOptions;
          createTimeout?: number;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          language?: SandboxLanguage;
          sandboxId?: string;
          timeout?: number;
        },
        RunResult,
        Name
      >;
    };
  };
