import Link from "next/link";
import { ArrowRight, Terminal } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, PageShell } from "@/components/layout/page-shell";

export const metadata = {
  title: "Connect Claude Code · Causalist",
  description:
    "One install, three commands. Claude Code reads your causal graph and pushes new projects into Causalist.",
};

/**
 * Slim, scannable setup. Two paragraphs of context max — the rest is
 * copy-pasteable commands. Anything heavier lives in /docs.
 */
export default function ClaudeCodePage() {
  return (
    <PageShell width="docs">
      <PageHeader
        eyebrow="Connect Claude Code"
        title="Three commands."
        description="Pair Claude Code with Causalist so the agent can read your graph (10 tools) and push new projects into your list."
      />

      {/* The three commands — front and center */}
      <ol className="mb-8 space-y-3">
        <Step
          n={1}
          title="Install"
          code="npm i -g causalist-cli causalist-mcp"
          body="One package gives you the CLI; the other is the MCP server Claude Code talks to."
        />
        <Step
          n={2}
          title="Pair this browser"
          code="causalist init"
          body={
            <>
              Opens a one-time pair link. Once paired, the MCP server knows
              which browser session to push to. Or visit{" "}
              <Link
                href="/pair"
                className="font-medium text-accent-magenta hover:underline"
              >
                /pair
              </Link>{" "}
              for a manual code.
            </>
          }
        />
        <Step
          n={3}
          title="Wire the server into Claude Code"
          code="claude mcp add causalist -- npx -y causalist-mcp@latest"
          body="Claude Code now has 10 graph-aware tools — query_node, blast_radius, affected_tests, find_writers, and more — plus create_project to add repos to your list."
        />
      </ol>

      {/* What this gets you */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <Terminal size={11} />
          Why pair?
        </div>
        <ul className="mt-3 space-y-2 text-[13px] text-neutral-700">
          <li className="flex gap-2">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-magenta" />
            <span>
              <strong>Faster edits.</strong> Claude Code stops re-reading the
              whole repo — it queries the graph instead.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-magenta" />
            <span>
              <strong>Knows what breaks.</strong> <code className="font-mono text-[12px]">blast_radius</code> + <code className="font-mono text-[12px]">affected_tests</code> tell it exactly which files and tests a change touches before it commits.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-magenta" />
            <span>
              <strong>Pushes new projects to you.</strong> When you ask
              Claude Code to map a repo, it appears in your{" "}
              <Link href="/app" className="font-medium hover:underline">
                Projects
              </Link>{" "}
              list automatically.
            </span>
          </li>
        </ul>
      </section>

      <p className="mt-6 text-center text-[12px] text-neutral-400">
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
        Want detail?{" "}
        <Link
          href="/docs/foundations"
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
  code: string;
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
      <pre className="mt-3 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 p-3 font-mono text-[12.5px] text-white">
        $ {code}
      </pre>
      <p className="mt-2.5 text-[12.5px] leading-snug text-neutral-600">
        {body}
      </p>
    </li>
  );
}
