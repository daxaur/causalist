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
    { id: "cli", label: "packages/next/cli", layer: "api", language: "ts", kind: "module", summary: "The `next` binary's entrypoint. Parses argv, loads env files, and dispatches to the individual command modules (dev, build, start, lint, info). Everything a user types after `next` flows through here." },
    { id: "cmd-dev", label: "cli/dev", layer: "api", language: "ts", kind: "module", summary: "Implements `next dev`. Boots the dev server and picks a bundler — Turbopack by default in Next 16, Webpack only if `--webpack` is passed — then wires HMR and the dev overlay." },
    { id: "cmd-build", label: "cli/build", layer: "api", language: "ts", kind: "module", summary: "Implements `next build`. Kicks off the full production pipeline in `packages/next/build`, writes the `.next/` output directory, and prints the per-route size report." },
    { id: "cmd-start", label: "cli/start", layer: "api", language: "ts", kind: "module", summary: "Implements `next start`. Loads the prebuilt `.next/` output and serves it with the Node-runtime server — no compilation, just request handling." },

    // ── build pipeline ────────────────────────────────────────────────
    { id: "build", label: "packages/next/build", layer: "logic", language: "ts", kind: "module", summary: "The production build orchestrator called by `next build`. Discovers routes, runs SWC to transpile them, invokes Webpack or Turbopack to bundle, and writes the manifests and static assets that make up `.next/`." },
    { id: "build-collect", label: "build/collect-page-data", layer: "logic", language: "ts", kind: "module", summary: "Walks the `app/` and `pages/` directories to build the canonical route list — layouts, templates, loading/error boundaries, parallel routes, and route groups all get resolved here before bundling begins." },
    { id: "build-entries", label: "build/entries", layer: "logic", language: "ts", kind: "module", summary: "Turns the collected route list into bundler entrypoints. For each page it synthesizes a loader module that imports the user's page plus the runtime glue, producing the entry map fed into Webpack or Turbopack." },
    { id: "build-manifests", label: "build/manifests", layer: "data", language: "ts", kind: "module", summary: "Writes the JSON manifests the runtime reads at request time — `build-manifest.json`, `app-paths-manifest.json`, `middleware-manifest.json`, `routes-manifest.json`. Without these the server can't map a URL to a chunk." },
    { id: "webpack", label: "build/webpack-config", layer: "infra", language: "ts", kind: "module", summary: "The massive Webpack 5 config factory. Still the default for production builds in Next 16 — handles RSC layers, server/client splits, SWC loader config, and dozens of plugins. Kept alive for compatibility while Turbopack stabilizes for build." },
    { id: "turbopack", label: "turbopack", layer: "infra", language: "rs", kind: "module", summary: "Vercel's Rust-based incremental bundler. Default for `next dev` in Next 16, opt-in for production. Exposed to Node via an N-API binding so the JS pipeline can drive compilation across language boundaries." },
    { id: "swc", label: "@swc/core", layer: "infra", language: "rs", kind: "external", summary: "Rust-based TS/JS compiler. Next uses it to transpile every source file (replacing Babel) and to run custom transforms for things like next/font and React Server Components." },

    // ── server ────────────────────────────────────────────────────────
    { id: "server", label: "packages/next/server", layer: "logic", language: "ts", kind: "module", summary: "The HTTP server package — entrypoint for both `next start` and `next dev`. Accepts incoming requests, matches them against the manifests, and hands off to the render pipeline. Re-exports the base + concrete server classes." },
    { id: "base-server", label: "server/base-server", layer: "logic", language: "ts", kind: "module", summary: "Abstract server class that encapsulates runtime-agnostic request handling — routing, caching, and render orchestration — with I/O methods left abstract. Both `next-server` (Node) and the Edge server extend it." },
    { id: "next-server", label: "server/next-server", layer: "logic", language: "ts", kind: "module", summary: "The Node-runtime concrete server. Implements `base-server`'s abstract I/O with fs + http, decides whether a request goes to `app-render` or `pages-render`, and runs middleware + incremental-cache lookups." },
    { id: "app-render", label: "server/app-render", layer: "logic", language: "tsx", kind: "module", summary: "Renders App Router trees with React Server Components. Drives Suspense boundaries, streams the HTML + RSC flight payload chunked via `react-server-dom-webpack`, and applies the patched fetch cache per render." },
    { id: "pages-render", label: "server/render", layer: "logic", language: "tsx", kind: "module", summary: "The legacy Pages Router renderer. Still handles any `pages/` routes in a mixed app — runs `getServerSideProps` / `getStaticProps`, then renders with ReactDOMServer. No RSC." },
    { id: "middleware", label: "server/middleware", layer: "logic", language: "ts", kind: "module", summary: "Runs `middleware.ts` code in the Edge runtime before routing resolves. Handles rewrites, redirects, cookies, and headers mutations — pipeline fed by `middleware-manifest.json`." },
    { id: "server-routes", label: "server/future/route-modules", layer: "logic", language: "ts", kind: "module", summary: "The route module abstraction — each `page.tsx`, `route.ts`, or `layout.tsx` gets wrapped in a typed module that exposes lifecycle hooks (handler, render, revalidate) to the server in a uniform way." },
    { id: "request-cache", label: "server/request-cache", layer: "data", language: "ts", kind: "module", summary: "Per-render memoization keyed by fetch URL + options. Ensures two identical `fetch()` calls in the same RSC tree only hit the network once, even across unrelated Server Components." },
    { id: "incremental-cache", label: "server/incremental-cache", layer: "data", language: "ts", kind: "module", summary: "The cross-request ISR store backing revalidation. Persists cached responses to the filesystem by default or to a custom cache handler (e.g. Redis), keyed so `revalidateTag` and `revalidatePath` can invalidate them." },

    // ── router layer ──────────────────────────────────────────────────
    { id: "app-router", label: "client/components/app-router", layer: "ui", language: "tsx", kind: "module", summary: "The client-side App Router. Owns the history stack, handles pushState/popState, streams RSC payloads for soft navigations, and maintains per-segment caches so back/forward feels instant." },
    { id: "link", label: "next/link", layer: "ui", language: "tsx", kind: "module", summary: "The <Link> component — renders an anchor that, on hover/viewport, prefetches the destination's RSC payload and, on click, hands control to the app-router for a client-side transition instead of a full reload." },
    { id: "navigation", label: "next/navigation", layer: "ui", language: "ts", kind: "module", summary: "The App Router's public hook + helper surface: `useRouter`, `usePathname`, `useSearchParams`, `useSelectedLayoutSegment`, plus the imperative `redirect` and `notFound` throwables." },
    { id: "headers", label: "next/headers", layer: "ui", language: "ts", kind: "module", summary: "Async accessors for the current request's `cookies()` and `headers()` — in Next 16 both return Promises and must be awaited inside Server Components, Route Handlers, and Server Actions." },

    // ── rendering primitives ──────────────────────────────────────────
    { id: "image", label: "next/image", layer: "ui", language: "tsx", kind: "module", summary: "Image optimization primitive — emits responsive `srcset`, lazy-loads by default, and routes through `/_next/image` (or a custom loader) to serve resized + re-encoded variants." },
    { id: "font", label: "next/font", layer: "ui", language: "ts", kind: "module", summary: "Compile-time font loader — `next/font/google` self-hosts Google Fonts into the build output, `next/font/local` ingests local files, and both return an object with `className` + CSS variable so you avoid FOUT and extra round-trips." },
    { id: "script", label: "next/script", layer: "ui", language: "tsx", kind: "module", summary: "Wrapper around third-party scripts with a `strategy` prop (`beforeInteractive`, `afterInteractive`, `lazyOnload`) so analytics and chat widgets don't block hydration." },
    { id: "dynamic", label: "next/dynamic", layer: "ui", language: "tsx", kind: "module", summary: "Code-splitting primitive — wraps a lazy import in a React component with an optional loading fallback. `ssr:false` is the canonical escape hatch for client-only libraries like three.js or charting." },

    // ── data fetching / cache ────────────────────────────────────────
    { id: "fetch-patch", label: "server/patch-fetch", layer: "data", language: "ts", kind: "module", summary: "Monkey-patches global `fetch` inside the RSC runtime to add caching and revalidation semantics. Reads the per-request dedupe cache first, then stores results in the incremental cache tagged with the caller's `cache`/`next.revalidate`/`next.tags` options." },
    { id: "cache-tags", label: "server/cache-tags", layer: "data", language: "ts", kind: "module", summary: "Implements the `revalidateTag` and `revalidatePath` primitives — writes tombstone entries into the incremental cache so the next request for anything tagged with those keys re-fetches from origin." },

    // ── config + types ────────────────────────────────────────────────
    { id: "config", label: "next.config.ts", layer: "config", language: "ts", kind: "file", summary: "User-authored config consumed by the build and server. Declares runtime options (images, rewrites, redirects, headers, experimental flags) and is loaded with jiti so TypeScript configs work without a separate compile step." },
    { id: "types", label: "@types/next", layer: "config", language: "ts", kind: "file", summary: "Ambient TypeScript declarations shipped with Next — provides types for `next/navigation`, `next/headers`, the `metadata` export, and the typed-routes feature when enabled." },
    { id: "pkg", label: "package.json", layer: "config", language: "json", kind: "file", summary: "The `next` package manifest — peer-depends on specific React versions, pins SWC and Turbopack native binaries per platform, and declares the `next` bin that maps to the CLI entrypoint." },

    // ── tests ─────────────────────────────────────────────────────────
    { id: "tests-e2e", label: "test/e2e", layer: "test", language: "ts", kind: "module", summary: "End-to-end test suite — boots a real Next process (dev or start) in a subprocess, drives it through Playwright, and asserts against real HTTP responses. The bulk of the repo's ~600 test files live here." },
    { id: "tests-unit", label: "test/unit", layer: "test", language: "ts", kind: "module", summary: "Jest unit tests for individual Next internals — things like route regex generation, config parsing, and render helpers that don't need a running server." },
    { id: "tests-prod", label: "test/production", layer: "test", language: "ts", kind: "module", summary: "Production-mode integration tests — runs `next build` then `next start` and validates behaviors that only differ from dev (ISR, static optimization, chunk splitting, output tracing)." },

    // ── externals ────────────────────────────────────────────────────
    { id: "react", label: "react", layer: "infra", language: "react", kind: "external", summary: "The React library itself — Next 16 requires React 19 for Server Components, Actions, and the concurrent renderer that `app-render` streams against." },
    { id: "react-dom", label: "react-dom", layer: "infra", language: "react", kind: "external", summary: "React's DOM renderer. The server half (`react-dom/server`) produces the HTML stream; the client half hydrates it and drives client-component updates." },
    { id: "react-server", label: "react-server-dom-webpack", layer: "infra", language: "react", kind: "external", summary: "The React Server Components wire format and client/server runtime. Serializes RSC trees into the 'flight' payload that `app-render` streams and the client app-router consumes." },
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
