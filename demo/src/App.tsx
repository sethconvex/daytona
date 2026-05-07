import { useAction, useMutation, useQuery } from "convex/react";
import { Boxes, CircleStop, Package, Play, Terminal } from "lucide-react";
import { type ChangeEvent, useMemo, useState } from "react";
import { api } from "../convex/_generated/api";

type AnalyzeResult = {
  commandOutput: string;
  dbContext: string;
  filePreview: string;
  installedPackageResult: string;
  length: number;
  wordCount: number;
};

type BundledResult = {
  filePreview: string;
  firstWord: string;
  length: number;
  node: string;
  upper: string;
  wordCount: number;
};

type CodeStorageResult = {
  exitCode: number;
  output: string;
  provider?: string;
  sandboxId: string;
};

export function App() {
  const analyzeText = useAction(api.daytona.analyzeText);
  const checkCodeStorage = useAction(api.daytona.checkCodeStorage);
  const runBundledLength = useAction(api.bundled.getStringLength);
  const startDurableJob = useAction(api.daytona.startDurableJob);
  const cancelJob = useMutation(api.daytona.cancelDurableJob);
  const [text, setText] = useState("measure this string in daytona");
  const [label, setLabel] = useState("demo build");
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [bundled, setBundled] = useState<BundledResult | null>(null);
  const [codeStorage, setCodeStorage] = useState<CodeStorageResult | null>(null);
  const [busy, setBusy] = useState<
    "analysis" | "bundled" | "codeStorage" | "job" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const job = useQuery(api.daytona.durableJob, jobId ? { jobId } : "skip");
  const outputPage = useQuery(
    api.daytona.durableOutput,
    jobId ? { jobId, limit: 200 } : "skip",
  );

  const output = useMemo(() => {
    return (outputPage?.output ?? [])
      .map((event: { content: string }) => event.content)
      .join("");
  }, [outputPage]);

  async function runAnalysis() {
    setBusy("analysis");
    setError(null);
    try {
      setAnalysis((await analyzeText({ text })) as AnalyzeResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function runBundledDemo() {
    setBusy("bundled");
    setError(null);
    try {
      setBundled((await runBundledLength({ text })) as BundledResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function runCodeStorageProbe() {
    setBusy("codeStorage");
    setError(null);
    try {
      setCodeStorage((await checkCodeStorage({})) as CodeStorageResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function startJob() {
    setBusy("job");
    setError(null);
    try {
      const result = await startDurableJob({ label });
      setJobId((result as { jobId: string }).jobId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Convex component demo</p>
          <h1>Run Convex work in Daytona</h1>
        </div>
        <div className="status">
          <Boxes size={18} />
          <span>@convex-dev/daytona</span>
        </div>
      </section>

      {error && <div className="error">{error}</div>}

      <section className="grid">
        <article className="panel">
          <div className="panelHeader">
            <Package size={18} />
            <h2>get string length in Daytona</h2>
          </div>
          <CodeBlock code={defineActionExample} />
          <textarea
            value={text}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setText(event.target.value)
            }
            rows={5}
          />
          <button onClick={runAnalysis} disabled={busy !== null}>
            <Play size={16} />
            Run in Daytona
          </button>
          <ResultCard analysis={analysis} loading={busy === "analysis"} />
        </article>

        <article className="panel">
          <div className="panelHeader">
            <Boxes size={18} />
            <h2>bundled TypeScript action</h2>
          </div>
          <CodeBlock code={bundledActionExample} />
          <textarea
            value={text}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setText(event.target.value)
            }
            rows={5}
          />
          <button onClick={runBundledDemo} disabled={busy !== null}>
            <Play size={16} />
            Run bundled action
          </button>
          <BundledResultCard result={bundled} loading={busy === "bundled"} />
        </article>

        <article className="panel">
          <div className="panelHeader">
            <Terminal size={18} />
            <h2>code.storage smoke test</h2>
          </div>
          <CodeBlock code={spritesProviderExample} />
          <button onClick={runCodeStorageProbe} disabled={busy !== null}>
            <Play size={16} />
            Test sandbox egress
          </button>
          <pre className="terminal">
            {busy === "codeStorage"
              ? "Checking convex.code.storage from the sandbox..."
              : codeStorage?.output || "Result will appear here."}
          </pre>
          <div className="jobMeta">
            {codeStorage && <span>exit {codeStorage.exitCode}</span>}
            {codeStorage?.provider && <span>{codeStorage.provider}</span>}
          </div>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <Terminal size={18} />
            <h2>durable command job</h2>
          </div>
          <CodeBlock code={durableJobExample} />
          <input
            value={label}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setLabel(event.target.value)
            }
            placeholder="Job label"
          />
          <div className="row">
            <button onClick={startJob} disabled={busy !== null}>
              <Play size={16} />
              Start job
            </button>
            <button
              className="secondary"
              onClick={() => jobId && cancelJob({ jobId })}
              disabled={!jobId || !job || isTerminal(job.status)}
            >
              <CircleStop size={16} />
              Cancel
            </button>
          </div>
          <div className="jobMeta">
            <span>{job?.status ?? "not started"}</span>
            {job?.durationMs !== undefined && <span>{job.durationMs} ms</span>}
            {job?.exitCode !== undefined && <span>exit {job.exitCode}</span>}
          </div>
          <pre className="terminal">{output || "Output will appear here."}</pre>
          <div className="artifacts">
            {job?.artifact && (
              <span>
                {job.artifact.path} · {Math.round(job.artifact.size / 1024)} KB
              </span>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function BundledResultCard({
  result,
  loading,
}: {
  result: BundledResult | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="result">Staging generated bundle in Daytona...</div>;
  }
  if (!result) {
    return <div className="result muted">Run this to test the package component API.</div>;
  }
  return (
    <div className="result">
      <dl>
        <div>
          <dt>Node</dt>
          <dd>{result.node}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{result.length}</dd>
        </div>
        <div>
          <dt>Words</dt>
          <dd>{result.wordCount}</dd>
        </div>
        <div>
          <dt>First Word</dt>
          <dd>{result.firstWord}</dd>
        </div>
        <div>
          <dt>Upper</dt>
          <dd>{result.upper}</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{result.filePreview}</dd>
        </div>
      </dl>
    </div>
  );
}

function ResultCard({
  analysis,
  loading,
}: {
  analysis: AnalyzeResult | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="result">Installing lodash and running in Daytona...</div>;
  }
  if (!analysis) {
    return <div className="result muted">Run this to see a Daytona result.</div>;
  }
  return (
    <div className="result">
      <dl>
        <div>
          <dt>Node</dt>
          <dd>{analysis.commandOutput}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{analysis.length}</dd>
        </div>
        <div>
          <dt>Words</dt>
          <dd>{analysis.wordCount}</dd>
        </div>
        <div>
          <dt>Lodash</dt>
          <dd>{analysis.installedPackageResult}</dd>
        </div>
        <div>
          <dt>DB Context</dt>
          <dd>{analysis.dbContext}</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{analysis.filePreview}</dd>
        </div>
      </dl>
    </div>
  );
}

function isTerminal(status: string) {
  return ["succeeded", "failed", "canceled"].includes(status);
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code">
      <code>
        {highlight(code).map((part, index) => (
          <span className={part.kind ? `tok ${part.kind}` : undefined} key={index}>
            {part.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

function highlight(code: string) {
  const pattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:export|const|return|async|await|handler|sandbox|packages|install|output|capture|command|image|path)\b|\b\d+\b|\/\/[^\n]*)/g;
  const parts: Array<{ kind?: string; text: string }> = [];
  let lastIndex = 0;
  for (const match of code.matchAll(pattern)) {
    if (match.index > lastIndex) {
      parts.push({ text: code.slice(lastIndex, match.index) });
    }
    const text = match[0];
    const kind = text.startsWith("//")
      ? "comment"
      : text.startsWith("\"") || text.startsWith("'") || text.startsWith("`")
        ? "string"
        : /^\d+$/.test(text)
          ? "number"
          : "keyword";
    parts.push({ kind, text });
    lastIndex = match.index + text.length;
  }
  if (lastIndex < code.length) {
    parts.push({ text: code.slice(lastIndex) });
  }
  return parts;
}

const defineActionExample = `export const analyzeText = daytona.defineAction({
  sandbox: { image: "node:22" },
  packages: ["lodash"],
  functions: {
    queries: { getFact: internal.facts.get },
  },
  handler: async (ctx, { text }) => {
    const fact = await ctx.queries.getFact({
      key: "demoContext",
    });
    await ctx.fs.writeFile("input.txt", text);
    const node = await ctx.exec("node --version");
    const lodash = ctx.require("lodash");

    return {
      dbContext: fact.value,
      node: node.stdout.trim(),
      length: text.length,
      words: lodash.words(text).length,
    };
  },
});`;

const bundledActionExample = `// convex/daytona/getStringLength.ts
import { summarizeString } from "../daytonaHelpers";

export default defineDaytonaHandler<{
  args: { text: string };
}>(async (ctx, { text }) => {
  await ctx.fs.writeFile("input.txt", text);
  const node = await ctx.exec("node --version");
  const filePreview = await ctx.fs.readFile("input.txt", "utf8");
  const summary = summarizeString(filePreview);

  return {
    filePreview: filePreview.slice(0, 80),
    firstWord: summary.firstWord,
    length: summary.length,
    node: node.stdout.trim(),
    upper: summary.upper,
    wordCount: summary.wordCount,
  };
});

// convex/daytonaHelpers.ts
export function summarizeString(text: string) {
  const words = text.trim() === ""
    ? []
    : text.trim().split(/\\s+/);
  return {
    firstWord: words[0] ?? "",
    length: text.length,
    upper: text.toUpperCase(),
    wordCount: words.length,
  };
}

// convex/bundled.ts
export const getStringLength = daytona.defineBundledAction({
  bundle: bundles.getStringLength,
  sandbox: { image: "node:22" },
});`;

const durableJobExample = `export const runBuild = daytona.defineDurableAction({
  sandbox: { image: "node:22" },
  packages: ["lodash"],
  handler: async (ctx, { label }) => {
    const fs = ctx.require("node:fs");
    const lodash = ctx.require("lodash");

    fs.mkdirSync("artifacts", { recursive: true });
    for (let i = 1; i <= 30; i += 1) {
      console.log("step " + i + "/30");
      fs.appendFileSync("artifacts/report.txt", label);
    }

    console.log("done " + lodash.startCase(label));
  },
});`;

const spritesProviderExample = `// Same component API, different provider.
const daytona = new DaytonaRunner(components.daytona, {
  auth: {
    provider: "sprites",
    spritesToken: process.env.SPRITES_TOKEN,
  },
});

await daytona.runCommand(ctx, {
  command: "curl -vkI https://convex.code.storage",
  timeout: 30,
});`;
