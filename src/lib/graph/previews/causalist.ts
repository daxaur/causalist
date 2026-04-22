import type { CausalGraph } from "../types";

export const causalistSelfGraph: CausalGraph = {
  repo: "daxaur/causalist",
  rootLabel: "causalist",
  commit: "main",
  nodes: [
    { id: "layout", label: "app/layout.tsx", path: "src/app/layout.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Root layout. Wires Fraunces + Geist + Geist Mono fonts." },
    { id: "page", label: "app/page.tsx", path: "src/app/page.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Landing page. Constellation hero, GitHub URL input, preview links." },
    { id: "dashboard", label: "dashboard/page.tsx", path: "src/app/dashboard/page.tsx", layer: "ui", language: "tsx", kind: "file", summary: "User's connected repos." },
    { id: "graph-page", label: "graph/[owner]/[repo]", path: "src/app/graph/[owner]/[repo]/page.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Graph viewer page. Async params per Next 16." },
    { id: "preview-page", label: "preview/[slug]", path: "src/app/preview/[slug]/page.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Canned preview renderer." },

    { id: "constellation", label: "ConstellationBackground", path: "src/components/landing/constellation-bg.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Canvas-rendered dot-line constellation." },
    { id: "graph-viewer", label: "<CausalGraphViewer>", path: "src/components/graph/causal-graph-viewer.tsx", layer: "ui", language: "tsx", kind: "file", summary: "3D + 2D force-graph viewer with layer colors." },
    { id: "node-panel", label: "<NodePanel>", path: "src/components/graph/node-panel.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Side panel — shows Claude's semantic label for the selected node." },
    { id: "layer-legend", label: "<LayerLegend>", path: "src/components/graph/layer-legend.tsx", layer: "ui", language: "tsx", kind: "file", summary: "Color key for the 7 semantic layers." },

    { id: "types", label: "graph/types.ts", path: "src/lib/graph/types.ts", layer: "data", language: "ts", kind: "file", summary: "CausalNode, CausalEdge, SemanticLayer." },
    { id: "devicon", label: "graph/devicon.ts", path: "src/lib/graph/devicon.ts", layer: "data", language: "ts", kind: "file", summary: "Maps file extensions to devicon SVG URLs." },
    { id: "preview-data", label: "previews/*.ts", path: "src/lib/graph/previews/causalist.ts", layer: "data", language: "ts", kind: "file", summary: "Canned graph datasets for demo." },

    { id: "api-analyze", label: "POST /api/analyze", path: "src/app/api/analyze/route.ts", layer: "api", language: "ts", kind: "file", summary: "Triggers the Claude agent pipeline." },
    { id: "api-auth", label: "GET /api/auth/github", path: "src/app/api/auth/github/route.ts", layer: "api", language: "ts", kind: "file", summary: "GitHub OAuth callback." },

    { id: "agent-structure", label: "StructureAgent", layer: "logic", language: "ts", kind: "module", summary: "Parses file tree, detects frameworks, maps directory semantics." },
    { id: "agent-dependency", label: "DependencyAgent", layer: "logic", language: "ts", kind: "module", summary: "Builds the import/call graph." },
    { id: "agent-semantic", label: "SemanticAgent", layer: "logic", language: "ts", kind: "module", summary: "Writes plain-English labels + layer classifications for every node." },
    { id: "agent-oracle", label: "OracleAgent", layer: "logic", language: "ts", kind: "module", summary: "Extended-thinking 'what-if?' simulator." },

    { id: "mcp-server", label: "causalist-mcp", layer: "infra", language: "ts", kind: "module", summary: "MCP server. Exposes map_repo, query_node, blast_radius, simulate tools." },
    { id: "cli", label: "causalist CLI", layer: "infra", language: "ts", kind: "module", summary: "Thin CLI wrapper — `causalist map <url>`." },

    { id: "octokit", label: "@octokit/rest", layer: "infra", language: "github", kind: "external", summary: "GitHub API client." },
    { id: "anthropic-sdk", label: "@anthropic-ai/sdk", layer: "infra", language: "anthropic", kind: "external", summary: "Claude Opus 4.7 API." },
    { id: "force-graph", label: "react-force-graph-3d", layer: "infra", language: "react", kind: "external", summary: "Force-directed 3D graph renderer." },

    { id: "tailwind", label: "tailwind v4", layer: "config", language: "tailwind", kind: "external" },
    { id: "globals", label: "globals.css", path: "src/app/globals.css", layer: "config", language: "css", kind: "file" },
    { id: "pkg", label: "package.json", path: "package.json", layer: "config", language: "json", kind: "file" },
  ],
  edges: [
    { source: "layout", target: "page", kind: "imports" },
    { source: "layout", target: "globals", kind: "imports" },
    { source: "page", target: "constellation", kind: "imports" },
    { source: "preview-page", target: "graph-viewer", kind: "imports" },
    { source: "preview-page", target: "preview-data", kind: "imports" },
    { source: "graph-page", target: "graph-viewer", kind: "imports" },
    { source: "graph-viewer", target: "types", kind: "imports" },
    { source: "graph-viewer", target: "devicon", kind: "imports" },
    { source: "graph-viewer", target: "node-panel", kind: "imports" },
    { source: "graph-viewer", target: "layer-legend", kind: "imports" },
    { source: "graph-viewer", target: "force-graph", kind: "imports" },
    { source: "preview-data", target: "types", kind: "imports" },
    { source: "devicon", target: "types", kind: "imports" },

    { source: "api-analyze", target: "agent-structure", kind: "calls" },
    { source: "api-analyze", target: "agent-dependency", kind: "calls" },
    { source: "api-analyze", target: "agent-semantic", kind: "calls" },
    { source: "api-analyze", target: "agent-oracle", kind: "calls" },
    { source: "api-analyze", target: "octokit", kind: "calls" },
    { source: "api-auth", target: "octokit", kind: "calls" },

    { source: "agent-structure", target: "anthropic-sdk", kind: "calls" },
    { source: "agent-dependency", target: "anthropic-sdk", kind: "calls" },
    { source: "agent-semantic", target: "anthropic-sdk", kind: "calls" },
    { source: "agent-oracle", target: "anthropic-sdk", kind: "calls" },
    { source: "agent-dependency", target: "agent-structure", kind: "reads" },
    { source: "agent-semantic", target: "agent-dependency", kind: "reads" },
    { source: "agent-oracle", target: "agent-semantic", kind: "reads" },

    { source: "mcp-server", target: "api-analyze", kind: "calls" },
    { source: "cli", target: "mcp-server", kind: "calls" },

    { source: "pkg", target: "tailwind", kind: "imports" },
  ],
};
