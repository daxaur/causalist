import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Graph,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { REFERENCES } from "@/lib/graph/references";

export const metadata = {
  title: "Reference graphs · Causalist",
  description:
    "Archetypal causal graphs that teach how languages and frameworks actually work.",
};

export default function ReferenceIndex() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={18} />
          <span className="font-display text-sm font-medium tracking-tight">
            reference
          </span>
        </Link>
        <div className="w-16" />
      </nav>

      <div className="mx-auto max-w-4xl px-8 pt-12 pb-24">
        <header className="mb-12">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            <BookOpen size={11} weight="duotone" />
            Reference
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-[-0.02em]">
            How things{" "}
            <em className="font-normal text-neutral-500">actually</em> work
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-500">
            Hand-drawn causal graphs of languages and frameworks. Each one corrects
            a misconception by showing the causal chain end-to-end. Click in,
            hover the nodes, ask the Oracle questions — this is what causal
            reasoning about code looks like.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REFERENCES.map((r) => (
            <Link
              key={r.slug}
              href={`/reference/${r.slug}`}
              className="group flex flex-col justify-between gap-6 rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow-sm"
            >
              <div>
                <div className="mb-3 flex items-center gap-2 text-neutral-400">
                  <Graph size={13} weight="duotone" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">
                    {r.graph.nodes.length} nodes · {r.graph.edges.length} edges
                  </span>
                </div>
                <h2 className="font-display text-lg font-medium leading-snug tracking-tight text-neutral-900">
                  {r.title}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
                  {r.subtitle}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-neutral-400">
                  {r.slug}
                </span>
                <ArrowRight
                  size={13}
                  className="text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
