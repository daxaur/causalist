import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Terminal,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Use with Claude Code · Causalist",
  description:
    "Install the Causalist MCP server and give Claude Code a typed causal graph of the repo. 10 tools, one install, zero config.",
};

export default function ClaudeCodePage() {
  return (
    <PageShell width="docs">
      <PageHeader
        eyebrow="For Claude Code"
        title="Give your agent a map of the repo"
        description="Causalist exposes a typed causal graph over MCP. Claude Code reads it, plans better edits, and knows what breaks before it ships."
      />

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-accent-magenta/10 to-transparent blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/claude-code.png"
              alt="Claude Code"
              width={48}
              height={48}
              className="h-10 w-auto"
            />
          </div>
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              MCP server · causalist-mcp
            </div>
            <div className="mt-0.5 font-display text-[15px] font-medium text-neutral-900">
              Three steps. No config file required.
            </div>
          </div>
          <a
            href="https://docs.claude.com/en/docs/claude-code/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-[12px] text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            What is Claude Code?
            <ArrowRight size={11} />
          </a>
        </div>
      </div>

      <section>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Setup · 3 steps
        </h3>
        <ol className="space-y-3">
          <SetupStep
            n={1}
            title="Install Claude Code"
            body={
              <>
                Grab the CLI from{" "}
                <a
                  href="https://docs.claude.com/en/docs/claude-code/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-accent-magenta"
                >
                  docs.claude.com/claude-code
                </a>
                . Run <code className="font-mono text-[12px]">claude</code> in
                your repo — it&rsquo;s an agent that reads, writes, and runs
                shells.
              </>
            }
          />
          <SetupStep
            n={2}
            title="Add the Causalist MCP server"
            body={
              <>
                One command — Claude Code handles the config for you:
                <pre className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 p-3 font-mono text-[11.5px] text-white">
{`claude mcp add causalist -- npx -y causalist-mcp@latest`}
                </pre>
                <div className="mt-2 text-[11px] text-neutral-400">
                  Prefer to edit the config yourself? Drop this into{" "}
                  <code className="font-mono">~/.claude/mcp.json</code>:
                </div>
                <pre className="mt-1 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11.5px] text-neutral-800">
{`{
  "mcpServers": {
    "causalist": {
      "command": "npx",
      "args": ["-y", "causalist-mcp@latest"]
    }
  }
}`}
                </pre>
                <div className="mt-2">
                  Claude Code now has 10 graph-reading tools:{" "}
                  <code className="font-mono text-[12px]">query_node</code>,{" "}
                  <code className="font-mono text-[12px]">get_neighbors</code>,{" "}
                  <code className="font-mono text-[12px]">find_path</code>,{" "}
                  <code className="font-mono text-[12px]">blast_radius</code>,
                  and more.
                </div>
              </>
            }
          />
          <SetupStep
            n={3}
            title="Pair your browser"
            body={
              <>
                So the tool-use events you see in the terminal stream into this
                tab in real time. Run:
                <pre className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11.5px] text-neutral-800">
                  curl -sSL https://causalist.xyz/api/pair/setup?code=XXXXXX |
                  sh
                </pre>
                <Link
                  href="/pair"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  <Terminal size={11} />
                  Get a pair code
                  <ArrowRight size={10} />
                </Link>
              </>
            }
          />
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-1 font-display text-[15px] font-medium tracking-tight text-neutral-900">
          The loop that matters
        </h3>
        <p className="mb-4 text-[13px] text-neutral-500">
          How Claude Code actually uses the graph when you give it a task.
        </p>
        <ul className="space-y-2.5 text-[13px] leading-relaxed text-neutral-700">
          <LoopStep n={1}>
            <em>You:</em> &ldquo;Add rate limiting to every authenticated API
            route.&rdquo;
          </LoopStep>
          <LoopStep n={2}>
            Claude calls{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              find_nodes_by_layer(&quot;api&quot;)
            </code>{" "}
            → finds 15 routes.
          </LoopStep>
          <LoopStep n={3}>
            Filters by{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              get_neighbors(auth-middleware, &quot;in&quot;)
            </code>{" "}
            → 11 depend on auth.
          </LoopStep>
          <LoopStep n={4}>Prints a plan. You approve.</LoopStep>
          <LoopStep n={5}>
            Edits files. Each Edit fires a{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              PostToolUse
            </code>{" "}
            hook → browser tab highlights the node.
          </LoopStep>
          <LoopStep n={6}>
            Calls{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              affected_tests(edited_ids)
            </code>{" "}
            → 12 of 340 tests touched. Runs those only.
          </LoopStep>
        </ul>
        <p className="mt-5 font-display text-[14px] italic text-neutral-600">
          Claude Code already knows what it changed. Causalist knows what that
          change <em>means</em>.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-3 font-display text-[15px] font-medium tracking-tight text-neutral-900">
          Tools exposed to your agent
        </h3>
        <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
          {TOOL_SUMMARIES.map((t) => (
            <div
              key={t.name}
              className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2"
            >
              <code className="font-mono text-[12px] font-medium text-neutral-900">
                {t.name}
              </code>
              <p className="mt-0.5 text-[12px] text-neutral-500">{t.what}</p>
            </div>
          ))}
        </div>
        <Link
          href="/agents"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-magenta underline-offset-2 hover:underline"
        >
          Full tool docs
          <ArrowRight size={11} />
        </Link>
      </section>
    </PageShell>
  );
}

function SetupStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[11px] font-medium text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-display text-[14px] font-medium text-neutral-900">
          {title}
          <CheckCircle
            size={12}
            weight="fill"
            className="text-emerald-400 opacity-0"
          />
        </div>
        <div className="mt-1 text-[13px] leading-relaxed text-neutral-600">
          {body}
        </div>
      </div>
    </li>
  );
}

function LoopStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 font-mono text-[11px] text-neutral-400">{n}.</span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

const TOOL_SUMMARIES = [
  { name: "query_node", what: "Full metadata on any node by id or path." },
  {
    name: "get_neighbors",
    what: "All imports / callers — one hop, any direction.",
  },
  { name: "find_path", what: "Shortest causal chain between two nodes." },
  {
    name: "find_nodes_by_layer",
    what: "Every API route, every UI component, etc.",
  },
  { name: "blast_radius", what: "What breaks if this node changes." },
  {
    name: "affected_tests",
    what: "Which tests transitively touch these edits.",
  },
  { name: "find_writers", what: "Who mutates this piece of state?" },
  { name: "similar_nodes", what: "Siblings by structure and semantics." },
  { name: "topo_order", what: "Dependency order for a subgraph." },
  {
    name: "co_change",
    what: "Nodes that tend to change together in commits.",
  },
];
