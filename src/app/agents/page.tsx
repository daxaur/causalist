import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Code,
  Lightning,
  Terminal,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { TOOL_SCHEMAS } from "@/lib/analyze/tools";

export const metadata = {
  title: "Agent API · Causalist",
  description:
    "How AI agents (Claude Code, Cursor, Hermes, anything with shell access) consume the Causalist causal graph.",
};

const HTTP_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/analyze",
    description:
      "Build a CausalGraph for a repository. Body: { owner, repo, commit, tree, files? }. Auth: Authorization: Bearer <anthropic-key>. Streams Server-Sent Events on `agent` and `done` channels.",
    curl: `curl -N https://causalist.xyz/api/analyze \\
  -H 'Authorization: Bearer $ANTHROPIC_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "owner": "vercel",
    "repo": "next.js",
    "commit": "HEAD",
    "tree": [{ "path": "package.json", "type": "file" }]
  }'`,
  },
  {
    method: "POST",
    path: "/api/pair",
    description:
      "Mint a new pair code. Returns { code, sessionId }. The code is 6 characters, TTL 10 minutes, single-use.",
    curl: `curl -X POST https://causalist.xyz/api/pair`,
  },
  {
    method: "GET",
    path: "/api/pair?code=XXXXXX",
    description:
      "Claim a pair code. Returns { sessionId, token }. Consumed codes 410 Gone.",
    curl: `curl 'https://causalist.xyz/api/pair?code=ABC234'`,
  },
  {
    method: "POST",
    path: "/api/ingest/[session]",
    description:
      "Claude Code hooks POST tool-use events here. Body is the Claude Code hook stdin JSON. Header `Authorization: Bearer <token>`. Publishes to the session stream.",
    curl: `curl -X POST https://causalist.xyz/api/ingest/$SESSION \\
  -H 'Authorization: Bearer $CAUSALIST_TOKEN' \\
  -H 'X-Causalist-Event: PostToolUse' \\
  -H 'Content-Type: application/json' \\
  -d '{ "tool_name": "Edit", "tool_input": { "file_path": "src/auth.ts" } }'`,
  },
  {
    method: "GET",
    path: "/api/stream/[session]",
    description:
      "SSE fan-out. Any client can subscribe with EventSource. Each event on the `tool` channel is a JSON payload emitted by the ingest endpoint.",
    curl: `curl -N https://causalist.xyz/api/stream/$SESSION`,
  },
  {
    method: "POST",
    path: "/api/annotate/[session]",
    description:
      "Mark nodes as failing / fixed / risky / verified / modified. Body: { repo, nodeIds[], status, note?, source? }. Publishes an `annotation` stream event.",
    curl: `curl -X POST https://causalist.xyz/api/annotate/$SESSION \\
  -H 'Content-Type: application/json' \\
  -d '{
    "repo": "vercel/next.js",
    "nodeIds": ["src-app-api-auth"],
    "status": "failing",
    "note": "Null check regression",
    "source": "claude-code"
  }'`,
  },
  {
    method: "GET",
    path: "/api/github-stars",
    description:
      "Live star count for daxaur/causalist. 10-minute ISR cache.",
    curl: `curl https://causalist.xyz/api/github-stars`,
  },
];

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={18} />
          <span className="font-display text-sm font-medium tracking-tight">
            agents
          </span>
        </Link>
        <a
          href="https://github.com/daxaur/causalist"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Source
        </a>
      </nav>

      <div className="mx-auto max-w-4xl px-8 pt-12 pb-24">
        <header className="mb-10">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            <Terminal size={11} weight="duotone" />
            Agent API
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-[-0.02em]">
            For agents that want to read code{" "}
            <em className="font-normal text-neutral-500">before</em> touching it
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-500">
            Causalist is a causal graph of your codebase that any agent —
            Claude Code, Cursor, Hermes, anything with shell access — can
            query. Every tool below is pure (no side effects). Every HTTP
            endpoint is a Server-Sent Event stream or a JSON fetch.
          </p>
        </header>

        {/* Killer demo */}
        <section className="mb-14 rounded-2xl border border-[#E838A4]/25 bg-[#fbe8f4]/40 p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#C92E8E]">
            <Lightning size={11} weight="fill" /> The loop that matters
          </div>
          <h2 className="mt-2 font-display text-2xl font-medium tracking-tight">
            The 6-call demo that wins
          </h2>
          <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-neutral-700">
            <li>
              <code className="font-mono text-neutral-900">1.</code>{" "}
              User asks CC:{" "}
              <em>&quot;add rate limiting to every authenticated API route.&quot;</em>
            </li>
            <li>
              <code className="font-mono text-neutral-900">2.</code> CC calls{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.86em]">
                find_nodes_by_layer(&quot;api&quot;)
              </code>{" "}
              — returns 15 routes.
            </li>
            <li>
              <code className="font-mono text-neutral-900">3.</code> CC filters
              by{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.86em]">
                get_neighbors(auth-middleware, &quot;in&quot;)
              </code>{" "}
              — 11 of them depend on auth.
            </li>
            <li>
              <code className="font-mono text-neutral-900">4.</code> CC prints
              the plan. User approves.
            </li>
            <li>
              <code className="font-mono text-neutral-900">5.</code> CC edits.
              Each Edit fires a{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.86em]">
                PostToolUse
              </code>{" "}
              hook → ingest → browser highlights the node.
            </li>
            <li>
              <code className="font-mono text-neutral-900">6.</code> CC calls{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.86em]">
                affected_tests([edited_ids])
              </code>{" "}
              — returns 12 of 340. Runs only those.
            </li>
          </ol>
          <p className="mt-5 font-display text-[15px] italic text-neutral-700">
            Claude Code already knows what it changed. Causalist knows what
            that change <em>means</em>.
          </p>
        </section>

        {/* Session pairing */}
        <section className="mb-14">
          <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-medium tracking-tight">
            <Terminal size={18} weight="duotone" className="text-[#E838A4]" />
            Pair the browser and the terminal
          </h2>
          <ol className="space-y-2 text-sm leading-relaxed text-neutral-600">
            <li>
              <span className="font-mono text-[11px] text-neutral-400">1.</span>{" "}
              Visit{" "}
              <Link
                href="/pair"
                className="font-mono text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-[#E838A4]"
              >
                causalist.xyz/pair
              </Link>{" "}
              in a browser — it shows a 6-char code.
            </li>
            <li>
              <span className="font-mono text-[11px] text-neutral-400">2.</span>{" "}
              In your terminal:{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px] text-neutral-800">
                causalist pair ABC234
              </code>
            </li>
            <li>
              <span className="font-mono text-[11px] text-neutral-400">3.</span>{" "}
              Browser flips to <strong>Paired</strong>. CLI writes{" "}
              <code className="font-mono text-[12px] text-neutral-800">
                ~/.causalist/session.json
              </code>
              .
            </li>
            <li>
              <span className="font-mono text-[11px] text-neutral-400">4.</span>{" "}
              Export{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px] text-neutral-800">
                CAUSALIST_SESSION
              </code>{" "}
              +{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px] text-neutral-800">
                CAUSALIST_TOKEN
              </code>{" "}
              in the shell that launches Claude Code. Its hooks auto-publish
              to the browser.
            </li>
          </ol>
        </section>

        {/* MCP tools */}
        <section className="mb-14">
          <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-medium tracking-tight">
            <BookOpen size={18} weight="duotone" className="text-[#E838A4]" />
            Tools the Oracle (and MCP server) expose
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-neutral-500">
            Every tool takes an in-memory <code className="font-mono">CausalGraph</code>{" "}
            and a typed argument object and returns{" "}
            <code className="font-mono">{`{ ok, summary, data? }`}</code>. Pure
            functions — same tool works from the browser, from a serverless
            route, and from a stdio MCP bridge.
          </p>

          <div className="space-y-3">
            {TOOL_SCHEMAS.map((t) => (
              <ToolCard
                key={t.name}
                name={t.name}
                description={t.description}
                input={t.input_schema as unknown as ToolInputSchema}
              />
            ))}
          </div>
        </section>

        {/* HTTP endpoints */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-medium tracking-tight">
            <Code size={18} weight="duotone" className="text-[#E838A4]" />
            HTTP endpoints
          </h2>
          <div className="space-y-3">
            {HTTP_ENDPOINTS.map((e) => (
              <EndpointCard key={e.path} {...e} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

type ToolInputSchema = {
  type: string;
  properties: Record<
    string,
    { type?: string; enum?: string[]; description?: string; items?: { type: string } }
  >;
  required?: string[];
};

function ToolCard({
  name,
  description,
  input,
}: {
  name: string;
  description: string;
  input: ToolInputSchema;
}) {
  const props = Object.entries(input.properties ?? {});
  return (
    <details className="group rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300">
      <summary className="flex cursor-pointer items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <code className="font-mono text-[14px] font-medium text-neutral-900">
            {name}
          </code>
          <p className="mt-1 text-[13px] text-neutral-500">{description}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500 group-open:bg-neutral-50">
          tool
        </span>
      </summary>
      <div className="border-t border-neutral-100 px-4 py-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          arguments
        </div>
        <ul className="space-y-1 text-[12.5px]">
          {props.map(([key, schema]) => (
            <li key={key} className="flex items-baseline gap-2">
              <code className="font-mono text-neutral-900">{key}</code>
              <span className="font-mono text-[11px] text-neutral-400">
                {schema.type}
                {schema.enum ? ` (${schema.enum.join(" | ")})` : ""}
                {input.required?.includes(key) ? " · required" : " · optional"}
              </span>
              {schema.description && (
                <span className="text-neutral-500">— {schema.description}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function EndpointCard({
  method,
  path,
  description,
  curl,
}: {
  method: string;
  path: string;
  description: string;
  curl: string;
}) {
  return (
    <details className="group rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300">
      <summary className="flex cursor-pointer items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={
                method === "POST"
                  ? "rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700"
                  : "rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-sky-700"
              }
            >
              {method}
            </span>
            <code className="font-mono text-[14px] font-medium text-neutral-900">
              {path}
            </code>
          </div>
          <p className="mt-1 text-[13px] text-neutral-500">{description}</p>
        </div>
      </summary>
      <pre className="overflow-x-auto border-t border-neutral-100 bg-neutral-50 px-4 py-3 font-mono text-[12px] leading-relaxed text-neutral-700">
        {curl}
      </pre>
    </details>
  );
}
