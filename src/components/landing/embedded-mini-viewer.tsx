"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, GithubLogo } from "@phosphor-icons/react";
import { LAYER_COLORS } from "@/lib/graph/types";
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
 * act as tabs that swap which preview's graph is loaded. Drag, click,
 * hover, orbit — all real, in-page, no modal.
 */
export function EmbeddedMiniViewer({ previews }: { previews: PreviewMeta[] }) {
  const [activeSlug, setActiveSlug] = useState(previews[0]?.slug ?? "");
  const active = previews.find((p) => p.slug === activeSlug) ?? previews[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 720, h: 420 });

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

  // Re-frame when the active graph changes.
  useEffect(() => {
    const ref = graphRef.current;
    if (!ref) return;
    const t = setTimeout(() => ref.zoomToFit?.(800, 60), 700);
    return () => clearTimeout(t);
  }, [active.slug, size.w, size.h]);

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
            />
          )}
        </div>
      </motion.div>

      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
        drag · orbit · click — it&rsquo;s the real 3D graph
      </p>
    </div>
  );
}
