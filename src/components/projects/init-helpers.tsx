"use client";

import { useState } from "react";
import { Copy, Check, DownloadSimple } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const MCP_JSON_TEMPLATE = (sessionId: string) =>
  JSON.stringify(
    {
      mcpServers: {
        causalist: {
          command: "npx",
          args: ["-y", "causalist-mcp@latest", "--session", sessionId],
        },
      },
    },
    null,
    2,
  );

const CLAUDE_MD_SNIPPET = `## Causalist MCP

This repo is paired with [Causalist](https://causalist.xyz). When reasoning
about code structure, prefer the Causalist tools over re-reading every file:

- \`query_node(id)\` — node metadata + summary
- \`get_neighbors(id, "in"|"out"|"both")\` — fan-in / fan-out
- \`find_path(source, target)\` — shortest causal path
- \`blast_radius(id, depth?)\` — what transitively depends on this node
- \`affected_tests(changedIds)\` — only the tests reachable from changes (3, not 300)
- \`find_writers(target)\` — every node that writes to a target (security audit)
- \`find_nodes_by_layer("api"|"data"|"ui"|"logic"|"infra"|"test"|"config")\`
- \`similar_nodes(id)\` — same layer/kind/degree
- \`topo_order(ids)\` — layered plan for a subgraph
- \`verify_edge(source, target, kind?)\` — confirm an edge exists
- \`create_project(owner, repo)\` — push a new project into the browser

Edges in the graph carry a \`verified\` flag. \`true\` = AST-confirmed, \`false\` = LLM-inferred. Treat verified edges as ground truth.
`;

export function InitHelpers({ sessionId }: { sessionId: string }) {
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);

  const mcpJson = MCP_JSON_TEMPLATE(sessionId || "YOUR_PAIR_CODE");

  const copy = async (text: string, which: "mcp" | "claude") => {
    await navigator.clipboard.writeText(text);
    if (which === "mcp") {
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 1500);
    } else {
      setCopiedClaude(true);
      setTimeout(() => setCopiedClaude(false), 1500);
    }
  };

  const downloadMcp = () => {
    const blob = new Blob([mcpJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".mcp.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* .mcp.json */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="font-display text-[14px] font-medium text-neutral-900">
              Drop into your repo: <code className="font-mono text-[12px]">.mcp.json</code>
            </div>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              Check this into git so anyone on the team gets Causalist with{" "}
              <code className="font-mono">claude</code>. Replace{" "}
              <code className="font-mono">YOUR_PAIR_CODE</code> with a code from{" "}
              <a href="/pair" className="text-accent-magenta hover:underline">
                /pair
              </a>
              .
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => copy(mcpJson, "mcp")}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-md border border-neutral-200 px-2.5 text-[11px] transition-colors",
                copiedMcp
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
              )}
            >
              {copiedMcp ? <Check size={11} weight="bold" /> : <Copy size={11} />}
              {copiedMcp ? "copied" : "copy"}
            </button>
            <button
              type="button"
              onClick={downloadMcp}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-neutral-900 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800"
            >
              <DownloadSimple size={11} weight="bold" />
              download
            </button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 p-3 font-mono text-[11.5px] text-white">
          {mcpJson}
        </pre>
      </div>

      {/* CLAUDE.md */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="font-display text-[14px] font-medium text-neutral-900">
              Append to your <code className="font-mono text-[12px]">CLAUDE.md</code>
            </div>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              Tells Claude Code which Causalist tools to reach for, so it
              traverses the graph instead of re-grepping the repo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(CLAUDE_MD_SNIPPET, "claude")}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2.5 text-[11px] transition-colors",
              copiedClaude
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
            )}
          >
            {copiedClaude ? <Check size={11} weight="bold" /> : <Copy size={11} />}
            {copiedClaude ? "copied" : "copy"}
          </button>
        </div>
        <pre className="max-h-[260px] overflow-auto rounded-md border border-neutral-200 bg-[#FAFAF8] p-3 font-mono text-[11.5px] leading-relaxed text-neutral-800">
          {CLAUDE_MD_SNIPPET}
        </pre>
      </div>
    </div>
  );
}
