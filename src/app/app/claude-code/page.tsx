import Link from "next/link";
import { Terminal } from "@phosphor-icons/react/dist/ssr";
import { PageShell } from "@/components/layout/page-shell";
import { ConnectClaudeCard } from "@/components/projects/connect-claude-card";

export const metadata = {
  title: "Connect Claude Code · Causalist",
  description:
    "Two commands wire Claude Code to your account. API key in, projects out.",
};

/**
 * The Claude Code setup page. The interactive `<ConnectClaudeCard>`
 * up top mints a key + shows the install snippet on the spot — the
 * step-by-step below is a reference, not the primary CTA. The legacy
 * pair-code flow gets a small "advanced" disclosure at the bottom for
 * the live browser-tab streaming case.
 */
export default function ClaudeCodePage() {
  return (
    <PageShell width="docs">
      {/* Hero */}
      <header className="mb-8">
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
          Mint an API key, paste two lines into your terminal. Claude Code can
          then create projects on your account and query your graphs — without
          re-grepping the repo.
        </p>
      </header>

      {/* The interactive card — does the work. */}
      <div className="mb-8">
        <ConnectClaudeCard variant="tall" />
      </div>

      {/* Reference: full step-by-step for the curious */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          What the snippet does
        </h2>
        <ol className="space-y-3">
          <ReferenceStep
            n={1}
            title="Install the CLI"
            cmd="npm install -g causalist-cli"
            note="Ships eleven graph-query subcommands + an optional Skill that teaches Claude Code when to use them."
          />
          <ReferenceStep
            n={2}
            title="Save your API key"
            cmd="causalist login --api-key cspl_live_…"
            note="Writes ~/.causalist/session.json. The MCP server and every CLI command pick it up automatically."
          />
          <ReferenceStep
            n={3}
            title="Optional — drop the Skill"
            cmd="causalist install"
            note="Adds SKILL.md to ~/.claude/skills/causalist/. Claude Code auto-discovers it; the model learns when to reach for `causalist blast`, `causalist tests`, etc."
          />
        </ol>
      </section>

      {/* Tools the agent can call */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <Terminal size={11} />
          What Claude Code can do once connected
        </div>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          <CmdRow
            cmd="causalist project create <repo>"
            desc="map a new repo on your account"
          />
          <CmdRow cmd="causalist blast <id>" desc="what depends on this node" />
          <CmdRow cmd="causalist tests <ids…>" desc="3 tests not 300" />
          <CmdRow cmd="causalist path <a> <b>" desc="shortest causal path" />
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
            cmd="causalist topo <ids…>"
            desc="topological build order"
          />
          <CmdRow cmd="causalist layer <name>" desc="nodes in a layer" />
          <CmdRow cmd="causalist node <id>" desc="single-node metadata" />
          <CmdRow cmd="causalist neighbors <id>" desc="direct in/out edges" />
        </div>
      </section>

      {/* Advanced — pair code for live browser streaming */}
      <section className="mb-6">
        <details className="group rounded-2xl border border-neutral-200 bg-white">
          <summary className="cursor-pointer list-none px-6 py-5 transition-colors hover:bg-neutral-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-[15px] font-medium text-neutral-900">
                  Advanced — live browser-tab streaming
                </div>
                <div className="mt-0.5 text-[12px] text-neutral-500">
                  Optional. Only needed if you want Claude Code&rsquo;s tool-use
                  events to stream live into a browser tab as it works.
                </div>
              </div>
              <span className="font-mono text-[10px] text-neutral-400 transition-transform group-open:rotate-180">
                ▾
              </span>
            </div>
          </summary>
          <div className="space-y-3 border-t border-neutral-100 p-6 pt-5 text-[12.5px] text-neutral-600">
            <p>
              Generate a 6-char code at{" "}
              <Link
                href="/pair"
                className="font-medium text-accent-magenta hover:underline"
              >
                /pair
              </Link>
              , then run{" "}
              <code className="font-mono text-[12px]">causalist pair &lt;code&gt;</code>{" "}
              on your machine. The browser tab will flip to{" "}
              <em className="text-neutral-900">paired</em> and start receiving
              live events.
            </p>
            <p className="text-neutral-500">
              You don&rsquo;t need this for normal project creation or graph
              queries — those run on the API key alone.
            </p>
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
        Manage keys in{" "}
        <Link
          href="/app/settings"
          className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
        >
          settings
        </Link>
      </p>
    </PageShell>
  );
}

function ReferenceStep({
  n,
  title,
  cmd,
  note,
}: {
  n: number;
  title: string;
  cmd: string;
  note: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-500">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-neutral-900">
          {title}
        </div>
        <pre className="mt-1 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 px-3 py-1.5 font-mono text-[12px] text-neutral-100">
          $ {cmd}
        </pre>
        <p className="mt-1.5 text-[11.5px] leading-snug text-neutral-500">
          {note}
        </p>
      </div>
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
