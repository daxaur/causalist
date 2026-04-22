import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { DocsMarkdown } from "@/components/docs/markdown";
import { CITATIONS, SECTIONS, sectionBySlug } from "@/lib/docs/content";

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = sectionBySlug(slug);
  if (!section) return {};
  return {
    title: `${section.title} · Causalist docs`,
    description: section.subtitle,
  };
}

export default async function DocsSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = sectionBySlug(slug);
  if (!section) notFound();

  const index = SECTIONS.findIndex((s) => s.slug === slug);
  const prev = index > 0 ? SECTIONS[index - 1] : null;
  const next = index < SECTIONS.length - 1 ? SECTIONS[index + 1] : null;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white/90 px-8 py-4 backdrop-blur">
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
            docs
          </span>
        </Link>
        <a
          href="https://github.com/daxaur/causalist"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Source
        </a>
      </nav>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 pt-10 pb-24">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <div className="mb-5 flex items-center gap-2 text-neutral-900">
              <BookOpen size={14} weight="duotone" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                Table of contents
              </span>
            </div>
            <ul className="space-y-0.5 text-[13px]">
              {SECTIONS.map((s) => {
                const active = s.slug === slug;
                return (
                  <li key={s.slug}>
                    <Link
                      href={`/docs/${s.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2.5 py-1.5 transition-colors ${
                        active
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      }`}
                    >
                      {s.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-10 border-t border-neutral-100 pt-5">
              <div className="mb-3 flex items-center gap-1.5 text-neutral-500">
                <Lightning size={11} weight="duotone" />
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  Citations
                </span>
              </div>
              <ul className="space-y-2 text-[11px] leading-snug text-neutral-500">
                {CITATIONS.map((c) => (
                  <li key={c.key}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block transition-colors hover:text-[#3DD6D0]"
                    >
                      <span className="text-neutral-700">{c.authors}</span>{" "}
                      <span className="text-neutral-400">· {c.year}</span>
                      <br />
                      <span className="font-mono text-[10px]">
                        {c.venue}
                      </span>{" "}
                      {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Article */}
        <article className="min-w-0 flex-1">
          <header className="mb-8 border-b border-neutral-100 pb-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Docs · {section.title.toLowerCase()}
            </p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-[-0.02em] text-neutral-900">
              {section.title}
            </h1>
            <p className="mt-3 text-[15px] text-neutral-500">
              {section.subtitle}
            </p>
          </header>

          <DocsMarkdown source={section.body} />

          {/* Prev / Next */}
          <nav className="mt-16 flex items-center justify-between gap-4 border-t border-neutral-100 pt-6">
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-md border border-neutral-200 p-4 transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <ArrowLeft
                  size={14}
                  className="shrink-0 text-neutral-400 transition-transform group-hover:-translate-x-0.5"
                />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    previous
                  </div>
                  <div className="truncate font-display text-sm font-medium text-neutral-900">
                    {prev.title}
                  </div>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className="group flex min-w-0 flex-1 items-center justify-end gap-2 rounded-md border border-neutral-200 p-4 text-right transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    next
                  </div>
                  <div className="truncate font-display text-sm font-medium text-neutral-900">
                    {next.title}
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
