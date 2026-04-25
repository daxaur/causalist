"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  Cursor,
  GithubLogo,
  X,
} from "@phosphor-icons/react";
import { LAYER_COLORS, LAYER_LABELS, type SemanticLayer } from "@/lib/graph/types";
import { rankImportance } from "@/lib/graph/importance";
import type { PreviewMeta } from "@/lib/graph/previews";
import { cn } from "@/lib/utils";

const ForceGraph3D = dynamic(
  () => import("react-force-graph-3d").then((m) => m.default),
  { ssr: false },
);

const ACCENT = "#E838A4";

/**
 * Embedded interactive 3D miniature for the landing page. Pills above
 * act as tabs that swap which preview's graph is loaded. The viewer
 * teaches itself: a layer legend at the bottom maps colors → meaning,
 * and clicking any node pops a small card explaining that file's tier
 * and layer. Drag, orbit, and click all happen in place.
 */
export function EmbeddedMiniViewer({ previews }: { previews: PreviewMeta[] }) {
  const [activeSlug, setActiveSlug] = useState(previews[0]?.slug ?? "");
  const active = previews.find((p) => p.slug === activeSlug) ?? previews[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 420 });

  type SelectedNode = {
    id: string;
    label: string;
    layer: SemanticLayer;
    summary?: string;
    tier: "hot" | "core" | "leaf";
    fanIn: number;
    fanOut: number;
  };
  const [selected, setSelected] = useState<SelectedNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const importance = useMemo(() => rankImportance(active.graph), [active]);
  const nodesById = useMemo(
    () => new Map(active.graph.nodes.map((n) => [n.id, n])),
    [active],
  );

  const data = useMemo(
    () => ({
      nodes: active.graph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        layer: n.layer,
      })),
      links: active.graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
      })),
    }),
    [active],
  );

  // Reset selection + reframe when the active graph changes.
  useEffect(() => {
    setSelected(null);
    const ref = graphRef.current;
    if (!ref) return;
    const t = setTimeout(() => ref.zoomToFit?.(800, 60), 700);
    return () => clearTimeout(t);
  }, [active.slug, size.w, size.h]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = (n: any) => {
    const node = nodesById.get(n.id);
    if (!node) return;
    const imp = importance.byId.get(n.id);
    setSelected({
      id: node.id,
      label: node.label,
      layer: node.layer,
      summary: node.summary,
      tier: imp?.tier ?? "leaf",
      fanIn: imp?.fanIn ?? 0,
      fanOut: imp?.fanOut ?? 0,
    });
  };

  return (
    <div className="w-full">
      {/* Pills as tabs */}
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {previews.map((p) => {
          const isActive = p.slug === activeSlug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => setActiveSlug(p.slug)}
              className={cn(
                "rounded-full border px-3 py-1.5 font-mono text-[12px] transition-all",
                isActive
                  ? "border-accent-magenta bg-accent-magenta text-white shadow-sm"
                  : "border-neutral-200 bg-white/80 text-neutral-700 hover:border-accent-magenta/60 hover:text-neutral-900",
              )}
            >
              {p.title}
            </button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_30px_60px_-30px_rgba(42,36,32,0.18)]"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-white/80 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-mono font-medium text-neutral-900">
              {active.title}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-neutral-400">
              {active.graph.nodes.length} nodes · {active.graph.edges.length} edges
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={`https://github.com/${active.graph.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-[11px] text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
            >
              <GithubLogo size={11} weight="fill" />
              source
            </a>
            <Link
              href={`/app/preview/${active.slug}`}
              className="flex h-7 items-center gap-1 rounded-md bg-neutral-900 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Open in app
              <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative h-[420px] w-full bg-[radial-gradient(circle_at_50%_30%,#FFF_0%,#F4F1EE_70%,#EAE6E0_100%)]"
        >
          {size.w > 0 && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <ForceGraph3D
              ref={graphRef}
              graphData={data}
              width={size.w}
              height={size.h}
              backgroundColor="rgba(0,0,0,0)"
              showNavInfo={false}
              cooldownTicks={120}
              nodeRelSize={4}
              nodeOpacity={0.95}
              nodeResolution={12}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeColor={(node: any) => {
                const tier = importance.byId.get(node.id)?.tier;
                if (tier === "hot") return ACCENT;
                return (
                  LAYER_COLORS[node.layer as keyof typeof LAYER_COLORS] ??
                  "#94a3b8"
                );
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              nodeVal={(node: any) => {
                const tier = importance.byId.get(node.id)?.tier;
                return tier === "hot" ? 4 : tier === "core" ? 2 : 1;
              }}
              linkColor={() => "rgba(42,36,32,0.18)"}
              linkOpacity={0.5}
              linkDirectionalParticles={0}
              enableNodeDrag={true}
              enableNavigationControls={true}
              onNodeClick={handleNodeClick}
            />
          )}

          {/* Single quiet hint when nothing's selected. Disappears on
              first click — the info card replaces it. */}
          {!selected && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-neutral-200 bg-white/85 px-2.5 py-1 font-mono text-[10px] text-neutral-500 backdrop-blur">
              <Cursor size={9} weight="duotone" />
              click any node
            </div>
          )}

          {/* Selected node card — top-left */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto absolute left-3 top-3 max-w-[260px] rounded-lg border border-neutral-200 bg-white/95 p-2.5 shadow-md backdrop-blur"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11.5px] font-medium text-neutral-900">
                      {selected.label}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-neutral-500">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            selected.tier === "hot"
                              ? ACCENT
                              : LAYER_COLORS[selected.layer],
                        }}
                      />
                      <span>{LAYER_LABELS[selected.layer]}</span>
                      <span className="text-neutral-300">·</span>
                      <span
                        className={cn(
                          selected.tier === "hot" && "text-accent-magenta",
                          selected.tier === "core" && "text-amber-600",
                          selected.tier === "leaf" && "text-neutral-500",
                        )}
                      >
                        {selected.tier}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                    className="-m-1 rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    <X size={10} />
                  </button>
                </div>
                {selected.summary && (
                  <p className="mt-2 text-[11px] leading-snug text-neutral-600">
                    {selected.summary}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-neutral-400">
                  <span>{selected.fanIn} in</span>
                  <span>·</span>
                  <span>{selected.fanOut} out</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
