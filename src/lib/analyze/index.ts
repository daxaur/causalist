// Client-side analyze entry point. Uses the user's Anthropic API key
// from settings to call Claude directly from the browser. The full
// four-agent pipeline runs server-side via the Claude Agent SDK; this
// browser surface exposes the Oracle's "what-if" tool for interactive
// queries on top of an already-rendered graph.

import Anthropic from "@anthropic-ai/sdk";
import { ORACLE_PROMPT } from "./prompts";
import type { CausalGraph } from "@/lib/graph/types";

export {
  STRUCTURE_PROMPT,
  DEPENDENCY_PROMPT,
  SEMANTIC_PROMPT,
  ORACLE_PROMPT,
} from "./prompts";

/** Browser-safe Claude client. Key stays in localStorage. */
export function claudeClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Ask the Oracle a question about an already-rendered graph.
 * Used for node-detail "what does this do?" + "what breaks if I delete this?"
 */
export async function askOracle(
  graph: CausalGraph,
  question: string,
  opts: { anthropicKey: string; nodeId?: string },
): Promise<string> {
  const client = claudeClient(opts.anthropicKey);
  const scopedNode = opts.nodeId
    ? graph.nodes.find((n) => n.id === opts.nodeId)
    : null;

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: ORACLE_PROMPT,
    messages: [
      {
        role: "user",
        content: `Graph for ${graph.repo}:\n\n\`\`\`json\n${JSON.stringify(
          { nodes: graph.nodes, edges: graph.edges },
          null,
          2,
        )}\n\`\`\`\n\n${scopedNode ? `Focused node: ${scopedNode.id} (${scopedNode.label})\n\n` : ""}Question: ${question}`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
