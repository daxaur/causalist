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
        title="Two steps."
        description="Add the Causalist MCP server. Claude Code gets 11 graph-aware tools — and can push new projects straight into your list."
      />

      {/* The two steps — front and center. No CLI: the MCP server is the
          whole integration; pairing happens in the browser. */}
      <ol className="mb-8 space-y-3">
        <Step
          n={1}
          title="Get a pair code"
          code={null}
          body={
            <>
              Visit{" "}
              <Link
                href="/pair"
                className="font-medium text-accent-magenta hover:underline"
              >
                /pair
              </Link>
              . Copy the 6-char code — you&rsquo;ll paste it into the MCP
              config below so Claude Code knows which browser to push graphs
              into.
            </>
          }
        />
        <Step
          n={2}
          title="Wire the MCP server into Claude Code"
          code="claude mcp add causalist -- npx -y causalist-mcp@latest --session YOUR_PAIR_CODE"
          body="One command. No npm install needed — npx fetches the latest server. Claude Code now has 11 graph tools (query_node, blast_radius, affected_tests, find_writers, create_project, …)."
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
          $ {code}
        </pre>
      )}
      <p className="mt-2.5 text-[12.5px] leading-snug text-neutral-600">
        {body}
      </p>
    </li>
  );
}
