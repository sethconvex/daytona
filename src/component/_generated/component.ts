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
};

type RunResult = {
  createdSandbox: boolean;
  deletedSandbox: boolean;
  result: ExecuteResult;
  sandbox: SandboxSummary;
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
          command: string;
          create?: CreateSandboxOptions;
          createTimeout?: number;
          cwd?: string;
          deleteSandboxAfter?: boolean;
          deleteTimeout?: number;
          env?: Record<string, string>;
          sandboxId?: string;
          timeout?: number;
        },
        RunResult,
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
