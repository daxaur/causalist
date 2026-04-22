import type { CausalGraph } from "../types";

// Hand-curated slice of vercel/next.js. Not exhaustive (the real repo is
// ~600 packages); this captures the architecturally significant surfaces
// a developer would want to see on the graph.
export const nextjsSliceGraph: CausalGraph = {
  repo: "vercel/next.js",
  rootLabel: "next.js",
  commit: "canary",
  nodes: [
    // ── CLI entry + core orchestration ────────────────────────────────
    { id: "cli", label: "packages/next/cli", layer: "api", language: "ts", kind: "module", summary: "`next` CLI. Parses args, dispatches to dev / build / start / lint / info commands." },
    { id: "cmd-dev", label: "cli/dev", layer: "api", language: "ts", kind: "module", summary: "Dev-server command. Spawns Turbopack or Webpack depending on config." },
    { id: "cmd-build", label: "cli/build", layer: "api", language: "ts", kind: "module", summary: "Production build command. Calls the build pipeline, emits .next/." },
    { id: "cmd-start", label: "cli/start", layer: "api", language: "ts", kind: "module", summary: "Serves a built application." },

    // ── build pipeline ────────────────────────────────────────────────
    { id: "build", label: "packages/next/build", layer: "logic", language: "ts", kind: "module", summary: "Production build orchestrator. Collects routes, runs SWC, writes manifests." },
    { id: "build-collect", label: "build/collect-page-data", layer: "logic", language: "ts", kind: "module", summary: "Walks app/ and pages/ to discover routes and layouts." },
    { id: "build-entries", label: "build/entries", layer: "logic", language: "ts", kind: "module", summary: "Generates the Webpack / Turbopack entry files for every route." },
    { id: "build-manifests", label: "build/manifests", layer: "data", language: "ts", kind: "module", summary: "Writes build-manifest.json, app-paths-manifest.json, middleware-manifest.json." },
    { id: "webpack", label: "build/webpack-config", layer: "infra", language: "ts", kind: "module", summary: "The legacy Webpack 5 configuration factory. Huge." },
    { id: "turbopack", label: "turbopack", layer: "infra", language: "rs", kind: "module", summary: "Rust bundler. Default dev bundler in 16. Integrates via N-API." },
    { id: "swc", label: "@swc/core", layer: "infra", language: "rs", kind: "external", summary: "Rust TS/JS compiler." },

    // ── server ────────────────────────────────────────────────────────
    { id: "server", label: "packages/next/server", layer: "logic", language: "ts", kind: "module", summary: "The HTTP server. Receives requests, resolves routes, hands off to render." },
    { id: "base-server", label: "server/base-server", layer: "logic", language: "ts", kind: "module", summary: "Framework-agnostic server logic shared by node + edge runtimes." },
    { id: "next-server", label: "server/next-server", layer: "logic", language: "ts", kind: "module", summary: "Node-runtime server implementation." },
    { id: "app-render", label: "server/app-render", layer: "logic", language: "tsx", kind: "module", summary: "Renders App Router RSC trees. Handles streaming, Suspense, flight." },
    { id: "pages-render", label: "server/render", layer: "logic", language: "tsx", kind: "module", summary: "Legacy Pages Router renderer." },
    { id: "middleware", label: "server/middleware", layer: "logic", language: "ts", kind: "module", summary: "Edge-runtime middleware pipeline." },
    { id: "server-routes", label: "server/future/route-modules", layer: "logic", language: "ts", kind: "module", summary: "Route module system — wraps page/route/layout for the server." },
    { id: "request-cache", label: "server/request-cache", layer: "data", language: "ts", kind: "module", summary: "Per-request dedupe cache for fetches within one render." },
    { id: "incremental-cache", label: "server/incremental-cache", layer: "data", language: "ts", kind: "module", summary: "Cross-request ISR/tag cache. File-system or external." },

    // ── router layer ──────────────────────────────────────────────────
    { id: "app-router", label: "client/components/app-router", layer: "ui", language: "tsx", kind: "module", summary: "Client-side app router. Handles pushState, prefetch, streaming nav." },
    { id: "link", label: "next/link", layer: "ui", language: "tsx", kind: "module", summary: "<Link> prefetch + client nav wrapper." },
    { id: "navigation", label: "next/navigation", layer: "ui", language: "ts", kind: "module", summary: "useRouter, useSelectedLayoutSegment, redirect, notFound." },
    { id: "headers", label: "next/headers", layer: "ui", language: "ts", kind: "module", summary: "Async cookies/headers accessors." },

    // ── rendering primitives ──────────────────────────────────────────
    { id: "image", label: "next/image", layer: "ui", language: "tsx", kind: "module" },
    { id: "font", label: "next/font", layer: "ui", language: "ts", kind: "module", summary: "Self-hosted Google + local fonts. Returns a className + css var." },
    { id: "script", label: "next/script", layer: "ui", language: "tsx", kind: "module" },
    { id: "dynamic", label: "next/dynamic", layer: "ui", language: "tsx", kind: "module", summary: "Dynamic imports with ssr:false." },

    // ── data fetching / cache ────────────────────────────────────────
    { id: "fetch-patch", label: "server/patch-fetch", layer: "data", language: "ts", kind: "module", summary: "Patches global fetch() to add caching semantics in RSC." },
    { id: "cache-tags", label: "server/cache-tags", layer: "data", language: "ts", kind: "module", summary: "revalidateTag / revalidatePath plumbing." },

    // ── config + types ────────────────────────────────────────────────
    { id: "config", label: "next.config.ts", layer: "config", language: "ts", kind: "file" },
    { id: "types", label: "@types/next", layer: "config", language: "ts", kind: "file" },
    { id: "pkg", label: "package.json", layer: "config", language: "json", kind: "file" },

    // ── tests ─────────────────────────────────────────────────────────
    { id: "tests-e2e", label: "test/e2e", layer: "test", language: "ts", kind: "module", summary: "End-to-end tests against a real Next process." },
    { id: "tests-unit", label: "test/unit", layer: "test", language: "ts", kind: "module" },
    { id: "tests-prod", label: "test/production", layer: "test", language: "ts", kind: "module" },

    // ── externals ────────────────────────────────────────────────────
    { id: "react", label: "react", layer: "infra", language: "react", kind: "external" },
    { id: "react-dom", label: "react-dom", layer: "infra", language: "react", kind: "external" },
    { id: "react-server", label: "react-server-dom-webpack", layer: "infra", language: "react", kind: "external", summary: "RSC serialization format." },
  ],
  edges: [
    // CLI
    { source: "cli", target: "cmd-dev", kind: "calls" },
    { source: "cli", target: "cmd-build", kind: "calls" },
    { source: "cli", target: "cmd-start", kind: "calls" },
    { source: "cmd-dev", target: "server", kind: "calls" },
    { source: "cmd-dev", target: "turbopack", kind: "calls" },
    { source: "cmd-build", target: "build", kind: "calls" },
    { source: "cmd-start", target: "server", kind: "calls" },

    // build pipeline
    { source: "build", target: "build-collect", kind: "calls" },
    { source: "build", target: "build-entries", kind: "calls" },
    { source: "build", target: "build-manifests", kind: "writes" },
    { source: "build", target: "webpack", kind: "calls" },
    { source: "build", target: "turbopack", kind: "calls" },
    { source: "build", target: "swc", kind: "calls" },

    // server composition
    { source: "server", target: "base-server", kind: "extends" },
    { source: "next-server", target: "base-server", kind: "extends" },
    { source: "next-server", target: "app-render", kind: "calls" },
    { source: "next-server", target: "pages-render", kind: "calls" },
    { source: "next-server", target: "middleware", kind: "calls" },
    { source: "next-server", target: "server-routes", kind: "calls" },
    { source: "next-server", target: "incremental-cache", kind: "reads" },
    { source: "app-render", target: "react-server", kind: "calls" },
    { source: "app-render", target: "request-cache", kind: "reads" },
    { source: "app-render", target: "fetch-patch", kind: "calls" },
    { source: "app-render", target: "react", kind: "calls" },
    { source: "app-render", target: "react-dom", kind: "calls" },
    { source: "pages-render", target: "react", kind: "calls" },

    // cache
    { source: "fetch-patch", target: "request-cache", kind: "writes" },
    { source: "fetch-patch", target: "incremental-cache", kind: "writes" },
    { source: "cache-tags", target: "incremental-cache", kind: "writes" },

    // router primitives
    { source: "app-router", target: "link", kind: "imports" },
    { source: "app-router", target: "navigation", kind: "imports" },
    { source: "app-router", target: "react", kind: "calls" },
    { source: "link", target: "app-router", kind: "calls" },
    { source: "headers", target: "app-render", kind: "reads" },

    // rendering extras
    { source: "image", target: "react", kind: "calls" },
    { source: "font", target: "build", kind: "reads" },
    { source: "dynamic", target: "react", kind: "calls" },

    // config wiring
    { source: "config", target: "build", kind: "reads" },
    { source: "config", target: "server", kind: "reads" },
    { source: "config", target: "turbopack", kind: "reads" },
    { source: "pkg", target: "react", kind: "imports" },
    { source: "pkg", target: "react-dom", kind: "imports" },
    { source: "pkg", target: "swc", kind: "imports" },
    { source: "types", target: "navigation", kind: "reads" },

    // tests
    { source: "tests-e2e", target: "server", kind: "reads" },
    { source: "tests-e2e", target: "build", kind: "reads" },
    { source: "tests-unit", target: "app-render", kind: "reads" },
    { source: "tests-prod", target: "build", kind: "reads" },
  ],
};
