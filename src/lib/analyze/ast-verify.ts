// AST edge verification — reads the actual source we sent to the
// analyze pipeline and confirms whether each LLM-proposed edge is real.
//
// JS / TS / JSX / TSX  → @babel/parser, walk import declarations and
//                        `require()` calls.
// Python               → regex over `import x` / `from x import y`.
// Anything else        → leave unverified.
//
// Output: a Set of `${source}→${target}:${kind}` keys that are
// AST-verified. The pipeline annotates edges in-place with
// `verified: true/false`.

import { parse as babelParse, type ParserPlugin } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { CausalEdge, CausalGraph, CausalNode } from "@/lib/graph/types";

// `@babel/traverse` is CJS. In Node ESM / Next, default-interop
// sometimes hands back { default: fn } in `default`. Normalize.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse: typeof _traverse = ((_traverse as any).default ??
  _traverse) as typeof _traverse;

/** Key for a directed, kind-specific edge lookup. */
function edgeKey(source: string, target: string, kind: string) {
  return `${source}→${target}:${kind}`;
}

/**
 * Verify a graph's edges against the source files that produced it.
 * Mutates `graph.edges` in place, setting `verified: true` on every
 * edge we find evidence for. Returns stats so the caller can log/show.
 */
export function verifyGraphEdges(
  graph: CausalGraph,
  files: { path: string; content: string }[] | undefined,
): { total: number; verified: number; files: number } {
  if (!files || files.length === 0) {
    return { total: graph.edges.length, verified: 0, files: 0 };
  }

  // Build a lookup from file path → node id so the verifier can match
  // an import specifier resolved path back to a node in the graph.
  const nodeByPath = new Map<string, CausalNode>();
  for (const n of graph.nodes) {
    if (n.path) nodeByPath.set(normalizePath(n.path), n);
  }

  // Collect verified edge keys across every file.
  const verified = new Set<string>();

  for (const f of files) {
    const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
    const sourceNode = findNodeForPath(f.path, nodeByPath);
    if (!sourceNode) continue;

    if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") {
      for (const target of extractJsImports(f.content, f.path)) {
        const resolved = resolveImport(f.path, target, nodeByPath);
        if (resolved) {
          verified.add(edgeKey(sourceNode.id, resolved.id, "imports"));
        } else if (target && target.startsWith(".") === false) {
          // External package — try to find an `ext-*` node by name.
          const ext = findExternalNode(target, graph.nodes);
          if (ext) verified.add(edgeKey(sourceNode.id, ext.id, "imports"));
        }
      }
    } else if (ext === "py") {
      for (const target of extractPyImports(f.content)) {
        const resolved = resolvePyImport(target, nodeByPath);
        if (resolved) {
          verified.add(edgeKey(sourceNode.id, resolved.id, "imports"));
        } else {
          const extN = findExternalNode(target, graph.nodes);
          if (extN) verified.add(edgeKey(sourceNode.id, extN.id, "imports"));
        }
      }
    }
  }

  // Stamp edges with the verification result.
  let hits = 0;
  for (const e of graph.edges) {
    if (verified.has(edgeKey(e.source, e.target, e.kind))) {
      e.verified = true;
      hits++;
    } else if (e.verified === undefined) {
      e.verified = false;
    }
  }
  return { total: graph.edges.length, verified: hits, files: files.length };
}

function normalizePath(p: string): string {
  return p.replace(/^\.?\/+/, "").replace(/\\/g, "/");
}

function findNodeForPath(
  path: string,
  byPath: Map<string, CausalNode>,
): CausalNode | undefined {
  const p = normalizePath(path);
  return byPath.get(p) ?? byPath.get(stripExt(p));
}

function stripExt(p: string) {
  return p.replace(/\.[a-z]+$/i, "");
}

// ── JS / TS extraction ─────────────────────────────────────────────

function extractJsImports(source: string, path: string): string[] {
  const out: string[] = [];
  const isTs = /\.tsx?$/.test(path);
  let ast;
  try {
    ast = babelParse(source, {
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      plugins: (
        [
          isTs ? "typescript" : undefined,
          /\.(tsx|jsx)$/.test(path) ? "jsx" : undefined,
          "decorators-legacy",
          "classProperties",
          "optionalChaining",
          "nullishCoalescingOperator",
          "topLevelAwait",
          "importAttributes",
        ].filter(Boolean) as ParserPlugin[]
      ),
      errorRecovery: true,
    });
  } catch {
    return out;
  }

  traverse(ast, {
    ImportDeclaration(p) {
      const v = p.node.source.value;
      if (v) out.push(v);
    },
    ExportAllDeclaration(p) {
      const v = p.node.source?.value;
      if (v) out.push(v);
    },
    ExportNamedDeclaration(p) {
      const v = p.node.source?.value;
      if (v) out.push(v);
    },
    CallExpression(p) {
      const callee = p.node.callee;
      const isRequire =
        callee.type === "Identifier" && callee.name === "require";
      const isDynamicImport = callee.type === "Import";
      if (isRequire || isDynamicImport) {
        const arg = p.node.arguments[0];
        if (arg?.type === "StringLiteral") out.push(arg.value);
      }
    },
  });

  return out;
}

function resolveImport(
  fromPath: string,
  specifier: string,
  byPath: Map<string, CausalNode>,
): CausalNode | undefined {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) return undefined;
  const fromDir = fromPath.split("/").slice(0, -1).join("/");
  const joined = joinPath(fromDir, specifier);
  const normalized = normalizePath(joined);

  // Try in order: as-is, +ts, +tsx, +js, +jsx, /index.ts, /index.tsx, …
  const candidates = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.js`,
    `${normalized}.jsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
    `${normalized}/index.js`,
    `${normalized}/index.jsx`,
  ];
  for (const c of candidates) {
    const hit = byPath.get(c) ?? byPath.get(stripExt(c));
    if (hit) return hit;
  }
  return undefined;
}

function joinPath(dir: string, spec: string): string {
  const parts = (dir ? `${dir}/${spec}` : spec).split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}

// ── Python extraction ──────────────────────────────────────────────

function extractPyImports(source: string): string[] {
  const out = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const s = line.trim();
    // `import x`, `import x.y, z.w`
    const m1 = /^import\s+([A-Za-z_][\w.]*(?:\s*,\s*[A-Za-z_][\w.]*)*)/.exec(s);
    if (m1) {
      for (const mod of m1[1].split(",")) out.add(mod.trim().split(/\s+as\s+/)[0]);
    }
    // `from x.y import z`
    const m2 = /^from\s+([A-Za-z_.][\w.]*)\s+import\s+/.exec(s);
    if (m2) out.add(m2[1]);
  }
  return [...out].filter(Boolean);
}

function resolvePyImport(
  specifier: string,
  byPath: Map<string, CausalNode>,
): CausalNode | undefined {
  if (specifier.startsWith(".")) return undefined; // relative — skip, rarely in the small slice
  const asPath = specifier.replaceAll(".", "/");
  const candidates = [
    `${asPath}.py`,
    `${asPath}/__init__.py`,
    asPath,
  ];
  for (const c of candidates) {
    const hit = byPath.get(c) ?? byPath.get(stripExt(c));
    if (hit) return hit;
  }
  return undefined;
}

// ── External-package matching ──────────────────────────────────────

function findExternalNode(
  specifier: string,
  nodes: CausalNode[],
): CausalNode | undefined {
  // Common patterns: "react", "@scope/pkg", "@scope/pkg/sub"
  const pkg = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  for (const n of nodes) {
    if (n.kind !== "external") continue;
    if (n.label === pkg) return n;
    if (n.id === `ext-${pkg}`) return n;
    if (n.id === `ext-${pkg.replace(/^@/, "").replace(/\//g, "-")}`) return n;
    if (n.label && pkg.endsWith(n.label)) return n;
  }
  return undefined;
}
