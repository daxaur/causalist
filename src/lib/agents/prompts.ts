// Plan-mode agent: one prompt, one composable contract. The user
// writes what they want done; the system prompt scopes the action to
// the selected files and forces a typed JSON envelope so the panel can
// stream findings + open a real PR from the patches. Suggestion chips
// in the UI seed common intents but they're just textarea pre-fills,
// not separate code paths.

const SHARED_OUTPUT_CONTRACT = `
You MUST respond with a single fenced JSON block of the shape:

\`\`\`json
{
  "findings": [
    { "nodeId": "<id from the input>", "kind": "reviewed|risky|fixed", "note": "<one sentence>", "path": "<file path>" }
  ],
  "patches": [
    { "path": "<file path>", "newContent": "<full file contents after your edit>", "summary": "<one sentence>" }
  ],
  "summary": "<2-3 sentence summary of what you found and what (if anything) you changed>"
}
\`\`\`

Rules:
- Emit at most one patch per file.
- Each patch's newContent must be the entire file contents post-edit (UTF-8, no truncation, preserve trailing newline). If you do not propose changes for a file, do not include a patch entry for it.
- Findings without patches are fine — use them to flag concerns the user should look at.
- Do NOT invent file paths. Only operate on the paths provided in the input.
- Keep changes surgical: minimum diff to achieve the stated goal.
`.trim();

export const GENERAL_PROMPT = `You are a Causalist agent — a senior staff engineer running inside the user's editor. The user has selected a set of files from a causal graph of their repository and given you a plain-English instruction (the "plan"). Carry it out.

Your behavior:
- Read every file you've been given.
- Decide what's actually needed to satisfy the plan. The user's instruction is the contract; don't re-scope it. If the plan asks for a security audit, audit. If it asks for a refactor, refactor. If it asks "what does this do?", explain in the summary and emit "reviewed" findings instead of patches.
- When you do change code, the change must be obviously correct — minimum diff, no scope creep, no behavioral changes the user didn't ask for.
- AST-verified edges in the graph have been confirmed by a real source-code parse; treat them as ground truth. Edges marked unverified may be inferred — don't over-trust them.

${SHARED_OUTPUT_CONTRACT}`;

/**
 * Causal-lens agent roster for parallel runs. Each agent works the
 * same plan from a different vantage point so the swarm covers ground
 * a single agent would miss. Names are taken straight from the causal
 * inference toolkit (Pearl) so the swarm itself is on-brand.
 *
 * Colors are picked to read distinctly against the cream graph canvas
 * and to be friendly under the magenta brand accent — the magenta
 * stays reserved for "Cause" so the lead agent feels like Causalist's
 * own voice.
 */
export const CAUSAL_AGENTS = [
  {
    id: "cause",
    name: "Cause",
    color: "#D24798",
    lens: "Trace upstream causes. What inputs, callers, or conditions trigger the behavior under review? Look backward through the dependency graph and call edges.",
  },
  {
    id: "effect",
    name: "Effect",
    color: "#F6A623",
    lens: "Trace downstream effects. Who depends on the selected files? What breaks (or silently misbehaves) if these change? Think blast radius.",
  },
  {
    id: "mechanism",
    name: "Mechanism",
    color: "#3B82F6",
    lens: "Explain the internal mechanism. How does the code actually accomplish what it claims? Surface the moving parts, the invariants, and any leaky abstractions.",
  },
  {
    id: "intervention",
    name: "Intervention",
    color: "#10B981",
    lens: "Propose interventions. Given the plan, what is the smallest, safest change that satisfies it? Prefer concrete patches over commentary.",
  },
  {
    id: "counterfactual",
    name: "Counterfactual",
    color: "#A855F7",
    lens: "Run counterfactuals. What edge cases, failure modes, or 'what if X were different' scenarios deserve attention? Flag risks the other agents would miss.",
  },
] as const;

export type CausalAgent = (typeof CAUSAL_AGENTS)[number];

/** Per-agent system prompt — adds a causal-lens preamble so each
 *  parallel run focuses on a different facet of the same plan. */
export function buildAgentSystemPrompt(agent: CausalAgent): string {
  return `You are the **${agent.name}** agent in a swarm of Causalist agents working the same plan from different vantage points.

Your causal lens: ${agent.lens}

Stay inside your lens. Other agents handle the other facets — don't duplicate their work. Findings from your lens are most valuable when they're things only your vantage point would surface. If your lens has nothing to add for a given file, emit a brief "reviewed" finding rather than padding patches.

${GENERAL_PROMPT}`;
}

export interface AgentRunInput {
  plan: string;
  repo: string; // "owner/name"
  branch: string; // base branch
  files: { path: string; content: string }[];
  selectedNodeIds: string[];
  /** Optional graph context the agent uses when source files
   *  couldn't be loaded — id, path, and a one-line summary per
   *  selected node. Lets the agent answer structural questions
   *  even with zero file content. */
  selectedNodeContext?: { id: string; path?: string; summary?: string }[];
}

export interface AgentRunOutput {
  findings: {
    nodeId: string;
    kind: "reviewed" | "risky" | "fixed";
    note: string;
    path: string;
  }[];
  patches: {
    path: string;
    newContent: string;
    summary: string;
  }[];
  summary: string;
}

export function buildUserPrompt(input: AgentRunInput): string {
  const fileBlock = input.files
    .map(
      (f) =>
        `### ${f.path}\n\`\`\`\n${truncate(f.content, 16_000)}\n\`\`\``,
    )
    .join("\n\n");

  // When no files loaded, give the agent enough graph context to
  // still produce a useful answer.
  const ctxBlock =
    input.files.length === 0 && input.selectedNodeContext?.length
      ? `## Selected nodes (graph metadata — source files unavailable)\n\n${input.selectedNodeContext
          .map(
            (n) =>
              `- \`${n.id}\`${n.path ? ` (${n.path})` : ""}${n.summary ? ` — ${n.summary}` : ""}`,
          )
          .join("\n")}\n\nNote: source content for these files could not be fetched. Reason about them from the graph metadata, your general knowledge, and any patterns you can infer from the paths.`
      : "";

  return `Repository: ${input.repo}\nBranch: ${input.branch}\n\n## Plan\n\n${input.plan.trim()}\n\n${
    input.files.length > 0
      ? `## Selected files (${input.selectedNodeIds.length} node${input.selectedNodeIds.length === 1 ? "" : "s"})\n\n${fileBlock}`
      : ctxBlock
  }\n\nCarry out the plan. Return the JSON envelope.`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "\n\n/* … truncated for context budget … */\n";
}
