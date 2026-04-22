// Stub analyze pipeline. Replace with the full four-agent Claude Agent
// SDK implementation once the prompt contracts are finalized. The
// important invariant for now is the return shape — the web viewer
// consumes this JSON directly.

export interface CausalNode {
  id: string;
  label: string;
  path?: string;
  layer: string;
  language?: string;
  kind?: string;
  summary?: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  kind: string;
}

export interface CausalGraph {
  repo: string;
  rootLabel: string;
  commit: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface AnalyzeOpts {
  owner: string;
  name: string;
  anthropicKey: string;
  githubToken?: string;
  onProgress?: (stage: number) => void;
}

export async function analyze(opts: AnalyzeOpts): Promise<CausalGraph> {
  // 0 — fetch tree
  opts.onProgress?.(0);
  await tick();

  // 1 — Structure agent
  opts.onProgress?.(1);
  await tick();

  // 2 — Dependency agent
  opts.onProgress?.(2);
  await tick();

  // 3 — Semantic agent
  opts.onProgress?.(3);
  await tick();

  // 4 — Oracle agent
  opts.onProgress?.(4);
  await tick();

  return {
    repo: `${opts.owner}/${opts.name}`,
    rootLabel: opts.name,
    commit: "stub",
    nodes: [
      { id: "root", label: opts.name, layer: "infra", kind: "module" },
      { id: "src", label: "src/", layer: "ui", kind: "module" },
      { id: "tests", label: "tests/", layer: "test", kind: "module" },
    ],
    edges: [
      { source: "root", target: "src", kind: "imports" },
      { source: "root", target: "tests", kind: "reads" },
    ],
  };
}

function tick(ms = 250): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
