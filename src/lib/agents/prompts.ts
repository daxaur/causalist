// Plan-mode agent: one prompt, one composable contract. The user
// writes what they want done; the system prompt scopes the action to
// the selected files and forces a typed JSON envelope so the panel can
// stream findings + open a real PR from the patches.
//
// We removed the four "personas" (Auditor / Security / Performance /
// Refactor) — Boris's pattern is plan-first then one-shot, not
// pick-a-persona. Suggestion chips in the UI seed common intents but
// they're just textarea pre-fills, not separate code paths.

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

export interface AgentRunInput {
  plan: string;
  repo: string; // "owner/name"
  branch: string; // base branch
  files: { path: string; content: string }[];
  selectedNodeIds: string[];
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

  return `Repository: ${input.repo}\nBranch: ${input.branch}\n\n## Plan\n\n${input.plan.trim()}\n\n## Selected files (${input.selectedNodeIds.length} node${input.selectedNodeIds.length === 1 ? "" : "s"})\n\n${fileBlock}\n\nCarry out the plan. Return the JSON envelope.`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "\n\n/* … truncated for context budget … */\n";
}
