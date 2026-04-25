import Link from "next/link";
import { Terminal } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/page-shell";
import { InitHelpers } from "@/components/projects/init-helpers";

export const metadata = {
  title: "Connect Claude Code · Causalist",
  description:
    "Install the Causalist CLI + Skill so Claude Code can query your causal graph instead of grepping the repo.",
};

/**
 * The CLI + Skill is the agent-first path Anthropic recommends
 * (post Nov 2025): code over tool-call JSON, with a SKILL.md that
 * teaches the model when to reach for which command. The MCP server
 * is offered second for non-CLI clients (Cursor, Claude.ai web).
 */
export default function ClaudeCodePage() {
  return (
    <PageShell width="docs">
      {/* Hero with the Claude Code logo as the visual anchor. */}
      <header className="mb-10">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/claude-code.png"
              alt="Claude Code"
              width={48}
              height={48}
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
              Connect Claude Code
            </div>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              Two commands.
            </h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-500">
          Install the Causalist CLI + Skill. Claude Code learns when to reach
          for <code className="font-mono text-[12px]">causalist blast</code>,{" "}
          <code className="font-mono text-[12px]">causalist tests</code>,{" "}
          <code className="font-mono text-[12px]">causalist writers</code> — and
          stops re-grepping your repo.
        </p>
      </header>

      {/* The two steps */}
      <ol className="mb-8 space-y-3">
        <Step
          n={1}
          title="Install the CLI + Skill"
          code={"npm i -g causalist-cli\ncausalist install"}
          body={
            <>
              <code className="font-mono text-[12px]">causalist install</code>{" "}
              drops a <code className="font-mono text-[12px]">SKILL.md</code>{" "}
              into <code className="font-mono text-[12px]">~/.claude/skills/causalist/</code>{" "}
              — Claude Code auto-discovers it. The CLI itself ships eleven
              graph-query subcommands ready to pipe through{" "}
              <code className="font-mono text-[12px]">jq</code>.
            </>
          }
        />
        <Step
          n={2}
          title="Pair this terminal"
          code="causalist pair <code>"
          body={
            <>
              Grab a 6-char code from{" "}
              <Link
                href="/pair"
                className="font-medium text-accent-magenta hover:underline"
              >
                /pair
              </Link>
              . Once paired, Claude Code can query your graph by repo, push
              new projects to your list, and stream tool-use events into the
              browser.
            </>
          }
        />
      </ol>

      {/* What this gets you */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <Terminal size={11} />
          The eleven commands Claude Code learns to use
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          <CmdRow
            cmd="causalist blast <id>"
            desc="what depends on this node"
          />
          <CmdRow
            cmd="causalist tests <ids...>"
            desc="3 tests not 300"
          />
          <CmdRow
            cmd="causalist path <a> <b>"
            desc="shortest causal path"
          />
          <CmdRow
            cmd="causalist writers <id>"
            desc="who writes to this state"
          />
          <CmdRow
            cmd="causalist verify <a> <b>"
            desc="is this edge real?"
          />
          <CmdRow
            cmd="causalist similar <id>"
            desc="structurally similar nodes"
          />
          <CmdRow
            cmd="causalist topo <ids...>"
            desc="topological build order"
          />
          <CmdRow
            cmd="causalist layer <name>"
            desc="nodes in a layer"
          />
          <CmdRow
            cmd="causalist node <id>"
            desc="single-node metadata"
          />
          <CmdRow
            cmd="causalist neighbors <id>"
            desc="direct in/out edges"
          />
          <CmdRow
            cmd="causalist info"
            desc="capabilities manifest"
          />
        </div>
      </section>

      {/* MCP fallback */}
      <section className="mb-6">
        <details className="group rounded-2xl border border-neutral-200 bg-white">
          <summary className="cursor-pointer list-none px-6 py-5 transition-colors hover:bg-neutral-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-[15px] font-medium text-neutral-900">
                  Or use the MCP server
                </div>
                <div className="mt-0.5 text-[12px] text-neutral-500">
                  For non-CLI clients (Cursor, Claude.ai web). Same eleven
                  tools, exposed over stdio.
                </div>
              </div>
              <span className="font-mono text-[10px] text-neutral-400 transition-transform group-open:rotate-180">
                ▾
              </span>
            </div>
          </summary>
          <div className="border-t border-neutral-100 p-6 pt-5">
            <p className="mb-4 text-[12.5px] text-neutral-600">
              Anthropic&rsquo;s{" "}
              <a
                href="https://www.anthropic.com/engineering/code-execution-with-mcp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-magenta hover:underline"
              >
                post-Nov 2025 guidance
              </a>{" "}
              prefers code/CLI over tool-call JSON for coding agents. We ship
              both — use the CLI for Claude Code, MCP everywhere else.
            </p>
            <InitHelpers sessionId="" />
          </div>
        </details>
      </section>

      <p className="mt-8 text-center text-[12px] text-neutral-400">
        New to Claude Code?{" "}
        <a
          href="https://docs.claude.com/en/docs/claude-code/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
        >
          docs.claude.com/claude-code
        </a>
        <span className="mx-2 text-neutral-300">·</span>
        Why this stack?{" "}
        <Link
          href="/docs/integrations"
          className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
        >
          read the docs
        </Link>
      </p>
    </PageShell>
  );
}

function Step({
  n,
  title,
  code,
  body,
}: {
  n: number;
  title: string;
  code: string | null;
  body: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[12px] text-white">
          {n}
        </span>
        <div className="font-display text-[15px] font-medium text-neutral-900">
          {title}
        </div>
      </div>
      {code && (
        <pre className="mt-3 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 p-3 font-mono text-[12.5px] text-white">
          {code
            .split("\n")
            .map((line) => `$ ${line}`)
            .join("\n")}
        </pre>
      )}
      <p className="mt-2.5 text-[12.5px] leading-snug text-neutral-600">
        {body}
      </p>
    </li>
  );
}

function CmdRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-neutral-100 py-1.5 last:border-0">
      <code className="shrink-0 font-mono text-[11.5px] text-neutral-900">
        {cmd}
      </code>
      <span className="truncate text-[11px] text-neutral-500">{desc}</span>
    </div>
  );
}
