"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CircleNotch,
  Key,
  Sparkle,
} from "@phosphor-icons/react";
import type { CausalGraph } from "@/lib/graph/types";
import { useSettings } from "@/lib/settings";

const MODEL = "claude-opus-4-7";
const EXPLAINER_SYSTEM = `You are the **Explainer** for Causalist. Given a full CausalGraph of a repository, write a plain-language article explaining HOW the codebase works and WHY it's structured this way.

Target audience: a developer who has never seen this repo, or a curious beginner who wants to understand software architecture.

## Rules
- Open with one sentence that captures what the project fundamentally is.
- Organize the article by the semantic layers present in the graph (infrastructure, data, logic, API, UI, tests, config).
- When you name a file, wrap it in \`backticks\` so the UI can hyperlink it back to its graph node.
- Use short paragraphs (2–4 sentences). Markdown headers ##, bullet lists OK.
- If the graph is small (<10 nodes), skip the layer headers and write a single flowing essay.
- Do NOT invent files that aren't in the graph.
- Do NOT restate the graph — explain the *idea*.

Output Markdown only. No JSON, no preamble.`;

export function ExplainerView({ graph }: { graph: CausalGraph }) {
  const settings = useSettings();
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const canGenerate = Boolean(settings.anthropicKey);

  const onGenerate = async () => {
    if (!canGenerate) return;
    try {
      setError(null);
      setStatus("streaming");
      setText("");
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({
        apiKey: settings.anthropicKey,
        dangerouslyAllowBrowser: true,
      });
      const stream = await client.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: EXPLAINER_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Graph for ${graph.repo}:\n\n\`\`\`json\n${JSON.stringify(
              { nodes: graph.nodes, edges: graph.edges },
              null,
              2,
            )}\n\`\`\``,
          },
        ],
      });

      let acc = "";
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          acc += event.delta.text;
          setText(acc);
        }
      }
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!canGenerate) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Key size={18} weight="duotone" />
        </div>
        <h2 className="mb-2 font-display text-2xl font-medium tracking-tight">
          Explainer needs your key
        </h2>
        <p className="mb-6 max-w-md text-sm text-neutral-500">
          Claude Opus 4.7 writes this narrative on the fly. Your key stays in
          your browser — calls go directly to Anthropic.
        </p>
        <Link
          href="/settings"
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
        >
          Add your key
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 pt-6">
      {!text && status === "idle" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkle
            size={22}
            weight="duotone"
            className="mb-4 text-[#3DD6D0]"
          />
          <h2 className="mb-2 font-display text-3xl font-medium tracking-[-0.02em]">
            A plain-English walkthrough
          </h2>
          <p className="mb-6 max-w-md text-sm text-neutral-500">
            Generate a narrative of how{" "}
            <span className="font-mono text-neutral-700">{graph.repo}</span>{" "}
            actually works. Written by Claude Opus 4.7 from the graph.
          </p>
          <button
            onClick={onGenerate}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-neutral-900 px-5 text-sm text-white transition-colors hover:bg-neutral-800"
          >
            <Sparkle size={15} weight="duotone" />
            Generate explainer
          </button>
        </div>
      )}

      {status === "streaming" && !text && (
        <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
          <CircleNotch size={14} className="mr-2 animate-spin" />
          thinking…
        </div>
      )}

      {text && (
        <article className="prose prose-neutral prose-sm max-w-none font-[var(--font-sans)] text-[15px] leading-[1.8] text-neutral-800">
          <RenderedExplainer text={text} />
          {status === "streaming" && (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#3DD6D0] align-middle" />
          )}
        </article>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-500">
          {error}
        </p>
      )}

      {status === "done" && (
        <div className="mt-10 flex items-center justify-between border-t border-neutral-100 pt-5 text-xs text-neutral-400">
          <span>
            generated by Claude Opus 4.7 ·{" "}
            {new Date().toLocaleTimeString()}
          </span>
          <button
            onClick={onGenerate}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight Markdown renderer — enough for headers, paragraphs, lists,
 * and inline `code` that we may later turn into node links.
 */
function RenderedExplainer({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    out.push(
      <ul
        key={`ul-${out.length}`}
        className="my-4 list-disc pl-5 text-neutral-700"
      >
        {listBuf.map((item, i) => (
          <li key={i} className="mb-1">
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*- /.test(line)) {
      listBuf.push(line.replace(/^\s*- /, ""));
      continue;
    }
    flushList();
    if (/^###\s+/.test(line)) {
      out.push(
        <h3
          key={i}
          className="mt-7 mb-2 font-display text-lg font-medium tracking-tight text-neutral-900"
        >
          {renderInline(line.replace(/^###\s+/, ""))}
        </h3>,
      );
    } else if (/^##\s+/.test(line)) {
      out.push(
        <h2
          key={i}
          className="mt-8 mb-3 font-display text-xl font-medium tracking-tight text-neutral-900"
        >
          {renderInline(line.replace(/^##\s+/, ""))}
        </h2>,
      );
    } else if (/^#\s+/.test(line)) {
      out.push(
        <h1
          key={i}
          className="mt-8 mb-3 font-display text-2xl font-medium tracking-tight text-neutral-900"
        >
          {renderInline(line.replace(/^#\s+/, ""))}
        </h1>,
      );
    } else if (line.trim() === "") {
      // blank line → paragraph break (handled by consecutive p tags)
    } else {
      out.push(
        <p key={i} className="my-3">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushList();
  return <>{out}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(regex)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={idx} className="font-medium text-neutral-900">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={idx}
          className="rounded-md bg-[#eafaf9] px-1.5 py-0.5 font-mono text-[0.85em] text-[#3DD6D0]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
