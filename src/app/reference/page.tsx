import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Graph,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { REFERENCES } from "@/lib/graph/references";

export const metadata = {
  title: "Reference graphs · Causalist",
  description:
    "Archetypal causal graphs that teach how languages and frameworks actually work.",
};

type Subject = {
  slug: string;
  label: string;
  match: (s: string) => boolean;
};

const SUBJECTS: Subject[] = [
  { slug: "lang", label: "Languages", match: (s) => /python|rust|sql/.test(s) },
  { slug: "web", label: "Web frameworks", match: (s) => /react|nextjs|vite/.test(s) },
  { slug: "runtime", label: "Runtimes", match: (s) => /node|event-loop/.test(s) },
];

function sizeTier(nodeCount: number): "hot" | "core" | "leaf" {
  if (nodeCount >= 20) return "hot";
  if (nodeCount >= 12) return "core";
  return "leaf";
}

const TIER_LABEL: Record<"hot" | "core" | "leaf", string> = {
  hot: "deep dive",
  core: "medium",
  leaf: "quick read",
};

export default function ReferenceIndex() {
  return (
    <PageShell width="docs">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <BookOpen size={11} weight="duotone" />
            Reference
          </span>
        }
        title={
          <>
            How things{" "}
            <em className="font-normal text-neutral-500">actually</em> work
          </>
        }
        description="Hand-drawn causal graphs of languages and frameworks. Each one corrects a misconception by showing the causal chain end-to-end. Click in, hover the nodes, ask the Oracle — this is what causal reasoning about code looks like."
      />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Subjects
          </div>
          <nav className="flex flex-col gap-0.5 text-sm">
            <a
              href="#all"
              className="rounded-md px-2 py-1.5 text-neutral-900 hover:bg-neutral-50"
            >
              All topics
              <span className="ml-2 font-mono text-[10px] text-neutral-400">
                {REFERENCES.length}
              </span>
            </a>
            {SUBJECTS.map((s) => {
              const count = REFERENCES.filter((r) => s.match(r.slug)).length;
              return (
                <a
                  key={s.slug}
                  href={`#${s.slug}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {s.label}
                  <span className="font-mono text-[10px] text-neutral-400">
                    {count}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-neutral-100 bg-neutral-50/60 p-3 text-[11px] leading-relaxed text-neutral-500">
            <div className="mb-1 flex items-center gap-1 font-mono uppercase tracking-wider text-neutral-400">
              <Lightning size={10} weight="fill" className="text-accent-magenta" />
              Submit
            </div>
            Want a graph we&rsquo;re missing? PRs welcome at{" "}
            <a
              href="https://github.com/daxaur/causalist"
              className="underline decoration-neutral-300 underline-offset-2 hover:decoration-accent-magenta"
            >
              daxaur/causalist
            </a>
            .
          </div>
        </aside>

        <div id="all" className="min-w-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {REFERENCES.map((r) => {
              const tier = sizeTier(r.graph.nodes.length);
              const subject =
                SUBJECTS.find((s) => s.match(r.slug))?.slug ?? "other";
              return (
                <Link
                  key={r.slug}
                  id={subject}
                  href={`/reference/${r.slug}`}
                  className="group relative flex flex-col justify-between gap-5 overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-accent-magenta transition-transform group-hover:scale-x-100"
                    aria-hidden
                  />
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span
                        className={
                          tier === "hot"
                            ? "rounded-full border border-accent-magenta/40 bg-accent-magenta/5 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent-magenta"
                            : tier === "core"
                              ? "rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-blue-700"
                              : "rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-neutral-500"
                        }
                      >
                        {TIER_LABEL[tier]}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                        <Graph size={10} weight="duotone" />
                        {r.graph.nodes.length}n · {r.graph.edges.length}e
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-medium leading-snug tracking-tight text-neutral-900">
                      {r.title}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
                      {r.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <span className="font-mono text-[10px] text-neutral-400">
                      {r.slug}
                    </span>
                    <ArrowRight
                      size={13}
                      className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-magenta"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
