import type { CausalEdge, CausalGraph, CausalNode } from "./types";

/**
 * Build a ready-to-paste prompt from a selection of nodes in a
 * CausalGraph. The prompt is designed to be dropped into Claude Code,
 * Cursor, or any coding agent — it includes paths, summaries, one-hop
 * causal context, and a placeholder for the user's instruction.
 */
export function buildFixPrompt(
  graph: CausalGraph,
  selectedIds: Iterable<string>,
  options: { task?: string } = {},
): string {
  const idSet = new Set(selectedIds);
  if (idSet.size === 0) return "";

  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  const selected: CausalNode[] = [];
  for (const id of idSet) {
    const n = nodesById.get(id);
    if (n) selected.push(n);
  }

  // 1-hop neighbors of each selected node
  const incoming = new Map<string, { n: CausalNode; kind: string }[]>();
  const outgoing = new Map<string, { n: CausalNode; kind: string }[]>();
  for (const id of idSet) {
    incoming.set(id, []);
    outgoing.set(id, []);
  }
  for (const e of graph.edges) {
    if (idSet.has(e.target)) {
      const src = nodesById.get(e.source);
      if (src && !idSet.has(e.source)) {
        incoming.get(e.target)!.push({ n: src, kind: e.kind });
      }
    }
    if (idSet.has(e.source)) {
      const tgt = nodesById.get(e.target);
      if (tgt && !idSet.has(e.target)) {
        outgoing.get(e.source)!.push({ n: tgt, kind: e.kind });
      }
    }
  }

  const lines: string[] = [];
  lines.push(
    `I'm working in the GitHub repository \`${graph.repo}\`${
      graph.commit ? ` at \`${graph.commit}\`` : ""
    }.`,
  );
  lines.push("");
  lines.push(
    `Below is a slice of its causal graph — ${selected.length} ${
      selected.length === 1 ? "file" : "files"
    } I want you to work on, plus their one-hop neighbors for context.`,
  );
  lines.push("");

  // Selected files
  lines.push(`## Files in scope`);
  for (const n of selected) {
    const path = n.path ?? `(${n.kind ?? "node"}: ${n.id})`;
    lines.push(`- \`${path}\` — ${n.summary ?? n.label} (layer: ${n.layer})`);
  }
  lines.push("");

  // Causal context — group per selected node
  const hasAnyNeighbor = selected.some(
    (n) => (incoming.get(n.id)?.length ?? 0) + (outgoing.get(n.id)?.length ?? 0) > 0,
  );
  if (hasAnyNeighbor) {
    lines.push(`## Causal context (1-hop)`);
    for (const n of selected) {
      const ins = incoming.get(n.id) ?? [];
      const outs = outgoing.get(n.id) ?? [];
      if (ins.length === 0 && outs.length === 0) continue;

      lines.push(`### \`${n.path ?? n.label}\``);
      if (outs.length > 0) {
        lines.push(`Depends on:`);
        for (const { n: m, kind } of outs.slice(0, 6)) {
          lines.push(
            `  - \`${m.path ?? m.label}\` (${kind}) — ${m.summary ?? m.label}`,
          );
        }
        if (outs.length > 6) lines.push(`  - +${outs.length - 6} more`);
      }
      if (ins.length > 0) {
        lines.push(`Depended on by:`);
        for (const { n: m, kind } of ins.slice(0, 6)) {
          lines.push(
            `  - \`${m.path ?? m.label}\` (${kind}) — ${m.summary ?? m.label}`,
          );
        }
        if (ins.length > 6) lines.push(`  - +${ins.length - 6} more`);
      }
      lines.push("");
    }
  }

  // Task directive
  lines.push(`## Task`);
  lines.push(
    options.task?.trim() ||
      `<describe what you want fixed, refactored, or explained across the files above>`,
  );
  lines.push("");
  lines.push(`## Guardrails`);
  lines.push(
    `- Start by reading every file in "Files in scope" before making changes.`,
  );
  lines.push(
    `- When you edit a file, consider its dependents listed above — run their tests if they exist.`,
  );
  lines.push(
    `- Don't invent files that aren't listed; ask for clarification if something is missing.`,
  );

  return lines.join("\n");
}

/** Shorter: just the paths, one per line — good for pasting into a terminal. */
export function buildPathList(
  graph: CausalGraph,
  selectedIds: Iterable<string>,
): string {
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  const paths: string[] = [];
  for (const id of selectedIds) {
    const n = nodesById.get(id);
    if (n?.path) paths.push(n.path);
  }
  return paths.join("\n");
}

/** Dummy export to force TS tree-shaking awareness of edge type. */
export type _ = CausalEdge;
