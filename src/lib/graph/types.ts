export type SemanticLayer =
  | "infra"
  | "data"
  | "logic"
  | "api"
  | "ui"
  | "test"
  | "config";

export interface CausalNode {
  id: string;
  label: string;
  path?: string;
  layer: SemanticLayer;
  language?: string;
  kind?: "file" | "module" | "function" | "type" | "external";
  size?: number;
  summary?: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  kind: "imports" | "calls" | "reads" | "writes" | "extends";
}

export interface CausalGraph {
  repo: string;
  rootLabel: string;
  commit?: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export const LAYER_COLORS: Record<SemanticLayer, string> = {
  infra: "#60a5fa",
  data: "#34d399",
  logic: "#fbbf24",
  api: "#f87171",
  ui: "#c084fc",
  test: "#e5e7eb",
  config: "#94a3b8",
};

export const LAYER_LABELS: Record<SemanticLayer, string> = {
  infra: "Infrastructure",
  data: "Data",
  logic: "Logic",
  api: "API surface",
  ui: "UI",
  test: "Tests",
  config: "Config",
};
