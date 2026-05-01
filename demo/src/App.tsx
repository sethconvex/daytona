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

export function App() {
  const analyzeText = useAction(api.daytona.analyzeText);
  const startDurableJob = useAction(api.daytona.startDurableJob);
  const cancelJob = useMutation(api.jobs.cancel);
  const [text, setText] = useState("measure this string in daytona");
  const [label, setLabel] = useState("demo build");
  const [jobId, setJobId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [busy, setBusy] = useState<"analysis" | "job" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useQuery(api.jobs.get, jobId ? { jobId: jobId as any } : "skip");
  const events = useQuery(api.events.recentOutputEvents);
  const artifacts = useQuery(api.events.artifacts);

  const output = useMemo(() => {
    if (job?.output) {
      return job.output;
    }
    const recent = events ?? [];
    return recent
      .slice()
      .reverse()
      .map((event: { content: string }) => event.content)
      .join("");
  }, [events, job?.output]);

  async function runAnalysis() {
    setBusy("analysis");
    setError(null);
    try {
      setAnalysis(await analyzeText({ text }));
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
      setJobId(result.jobId);
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
              onClick={() => jobId && cancelJob({ jobId: jobId as any })}
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
            {(artifacts ?? []).map(
              (artifact: {
                _id: string;
                path: string;
                size: number;
              }) => (
              <span key={artifact._id}>
                {artifact.path} · {Math.round(artifact.size / 1024)} KB
              </span>
              ),
            )}
          </div>
        </article>
      </section>
    </main>
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
    const fact = await ctx.runQuery("getFact", {
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
