"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  ArrowRight,
  Cube,
  GithubLogo,
  Lightning,
  Sparkle,
  TreeStructure,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { Logo } from "@/components/brand/logo";

export function FeaturesBento() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ingestRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative isolate mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-[14rem_14rem]"
    >
      {/* Top-left: Ingest */}
      <Card
        className="md:col-span-1 md:row-span-1"
        innerRef={ingestRef}
        eyebrow="Ingest"
        title="Paste any GitHub URL"
        copy="Public or private. Octokit fetches the repo tree client-side with your PAT. No upload step."
        icon={<GithubLogo size={18} weight="duotone" />}
      />

      {/* Top-center: Agents */}
      <Card
        className="md:col-span-1 md:row-span-1"
        innerRef={agentsRef}
        eyebrow="Analyze"
        title="Four Claude agents, parallel"
        copy="Structure · Dependency · Semantic · Oracle — each with a specialized system prompt. Results stream into the graph as they arrive."
        icon={<Sparkle size={18} weight="duotone" />}
        accent
      />

      {/* Top-right: Graph */}
      <Card
        className="md:col-span-1 md:row-span-1"
        innerRef={graphRef}
        eyebrow="Visualize"
        title="3D causal graph"
        copy="Every file placed, every import traced, layered by semantic role — infra, data, logic, API, UI, tests, config."
        icon={<Cube size={18} weight="duotone" />}
      />

      {/* Bottom-wide: Ask anything */}
      <div className="md:col-span-2 md:row-span-1">
        <Card
          className="h-full"
          eyebrow="Ask"
          title='"What breaks if I delete this module?"'
          copy="Click any node. Oracle answers using the graph as context — extended thinking for blast-radius simulation before you touch the code."
          icon={<TreeStructure size={18} weight="duotone" />}
          cta={{ href: "/preview/causalist", label: "See a live graph" }}
        />
      </div>

      {/* Bottom-right: Universal */}
      <div className="md:col-span-1 md:row-span-1">
        <Card
          className="h-full"
          eyebrow="Universal"
          title="Works in every agent"
          copy="Web, CLI, Claude Code plugin. Any agent that can run a shell command can map a repo."
          icon={<Lightning size={18} weight="duotone" />}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={ingestRef}
          toRef={agentsRef}
          pathColor="#e5e5e5"
          gradientStartColor="#0a0a0a"
          gradientStopColor="#3dd6d0"
          pathOpacity={0.35}
          pathWidth={1}
          duration={4}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={agentsRef}
          toRef={graphRef}
          pathColor="#e5e5e5"
          gradientStartColor="#3dd6d0"
          gradientStopColor="#0a0a0a"
          pathOpacity={0.35}
          pathWidth={1}
          duration={4}
          delay={0.5}
        />
      </div>
    </div>
  );
}

function Card({
  innerRef,
  className,
  eyebrow,
  title,
  copy,
  icon,
  cta,
  accent,
}: {
  innerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  eyebrow: string;
  title: string;
  copy: string;
  icon: React.ReactNode;
  cta?: { href: string; label: string };
  accent?: boolean;
}) {
  return (
    <div
      ref={innerRef}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white/70 p-5 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-sm",
        accent ? "border-[#3dd6d0]/40 bg-[#eafaf9]/80" : "border-neutral-200",
        className,
      )}
    >
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border",
              accent
                ? "border-[#3dd6d0]/40 bg-white text-[#3dd6d0]"
                : "border-neutral-200 bg-white text-neutral-700",
            )}
          >
            {icon}
          </span>
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-wider",
              accent ? "text-[#3dd6d0]" : "text-neutral-400",
            )}
          >
            {eyebrow}
          </span>
        </div>
        <h3 className="font-display text-lg font-medium leading-snug tracking-tight text-neutral-900">
          {title}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          {copy}
        </p>
      </div>

      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1 text-xs text-neutral-600 transition-colors hover:text-neutral-900"
        >
          {cta.label}
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}

      {accent && (
        <Logo
          size={110}
          aria-label=""
          className="pointer-events-none absolute -bottom-6 -right-6 text-[#3dd6d0]/10"
        />
      )}
    </div>
  );
}
