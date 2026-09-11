import { z } from "zod";

export type SandboxId = string & { readonly __sandbox: unique symbol };
export type SandboxRunId = string & { readonly __run: unique symbol };
export type SandboxArtifactId = string & { readonly __artifact: unique symbol };
export type Duration = `${number}${"s" | "m" | "h" | "d"}`;
export type Size = `${number}${"MiB" | "GiB"}`;
export const templates = {
  python: "python",
  node: "node",
  coding: "coding",
} as const;
export const PREVIEW_BYTES = 16 * 1024;
export const MAX_FILE_BYTES = 512 * 1024;
export const MAX_ARTIFACT_BYTES = 32 * 1024 * 1024;
export const durationSchema = z.custom<Duration>(
  (value) => typeof value === "string" && /^[1-9]\d*(s|m|h|d)$/.test(value),
);
export const sizeSchema = z.custom<Size>(
  (value) => typeof value === "string" && /^[1-9]\d*(MiB|GiB)$/.test(value),
);
export function durationMs(value: string): number {
  durationSchema.parse(value);
  const unit = value.slice(-1);
  const result =
    Number(value.slice(0, -1)) *
    { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  if (!Number.isSafeInteger(result) || result > 30 * 86_400_000)
    throw new Error("Duration must be at most 30 days.");
  return result;
}
export function sizeGiB(value: string): number {
  sizeSchema.parse(value);
  return (
    Number(value.replace(/(MiB|GiB)$/, "")) / (value.endsWith("MiB") ? 1024 : 1)
  );
}
export const resourceSchema = z.union([
  z.enum(["small", "medium", "large"]),
  z
    .object({
      cpu: z.number().int().min(1).max(32),
      memory: sizeSchema,
      disk: sizeSchema,
      gpu: z.number().int().min(0).max(8).optional(),
      gpuModel: z.string().optional(),
    })
    .strict(),
]);
export type Resources = z.infer<typeof resourceSchema>;
export const resourcePresets = {
  small: { cpu: 1, memory: "1GiB", disk: "3GiB" },
  medium: { cpu: 2, memory: "4GiB", disk: "10GiB" },
  large: { cpu: 4, memory: "8GiB", disk: "20GiB" },
} as const;
export const configSchema = z
  .object({
    template: z.string().min(1).max(200).default("coding"),
    resources: resourceSchema,
    idleTimeout: durationSchema.default("10m"),
    retention: durationSchema.default("7d"),
    secrets: z
      .record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string())
      .optional(),
  })
  .strict();
export type SandboxConfig = z.input<typeof configSchema>;
export const fileSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .max(4096)
      .refine(
        (p) => p.startsWith("/") && !p.includes("\0"),
        "Use an absolute path without NUL bytes.",
      ),
    contents: z.string().max(MAX_FILE_BYTES),
    encoding: z.enum(["utf8", "base64"]).default("utf8"),
  })
  .strict();
export const jobSchema = z
  .object({
    command: z
      .array(z.string().refine((s) => !s.includes("\0")))
      .min(1)
      .max(256),
    cwd: z.string().default("/workspace"),
    env: z
      .record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string())
      .optional(),
    files: z.array(fileSchema).max(100).optional(),
    outputs: z.array(z.string()).max(20).optional(),
    timeout: durationSchema.default("1h"),
    exportLogs: z.boolean().default(false),
    artifactRetention: durationSchema.default("7d"),
  })
  .strict()
  .superRefine((job, ctx) => {
    if (!job.cwd.startsWith("/") || job.cwd.includes("\0"))
      ctx.addIssue({
        code: "custom",
        message: "cwd must be an absolute path.",
      });
    for (const path of job.outputs ?? [])
      if (!path.startsWith("/") || path.includes("\0"))
        ctx.addIssue({
          code: "custom",
          message: "Output paths must be absolute.",
        });
    const total = (job.files ?? []).reduce(
      (sum, file) => sum + file.contents.length,
      0,
    );
    if (total > MAX_FILE_BYTES)
      ctx.addIssue({
        code: "custom",
        message: "Staged inputs exceed 512 KiB.",
      });
  });
export type Job = z.input<typeof jobSchema>;
export type RunStatus =
  | "queued"
  | "running"
  | "exited"
  | "timedOut"
  | "cancelled"
  | "failed";
export type Output = {
  text: string;
  truncated: boolean;
  outputPath?: string;
  artifactId?: SandboxArtifactId;
};
export type RunResult = {
  runId: SandboxRunId;
  status: "exited" | "timedOut" | "cancelled";
  exitCode: number | null;
  stdout: Output;
  stderr: Output;
  durationMs: number;
  artifacts: Array<{ path: string; artifactId: SandboxArtifactId }>;
};
export class SandboxError extends Error {
  constructor(
    public readonly code:
      | "VALIDATION"
      | "SERVICE"
      | "EXPIRED"
      | "BUSY"
      | "FAILED"
      | "NOT_FOUND",
    message: string,
    public readonly runId?: string,
  ) {
    super(message);
    this.name = "SandboxError";
  }
}
export function preview(text: string, limit = PREVIEW_BYTES): Output {
  const bytes = new TextEncoder().encode(text);
  return {
    text: new TextDecoder().decode(bytes.slice(0, limit)),
    truncated: bytes.length > limit,
  };
}
