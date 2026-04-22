import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { PREVIEWS, previewBySlug } from "@/lib/graph/previews";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";

export function generateStaticParams() {
  return PREVIEWS.map((p) => ({ slug: p.slug }));
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const preview = previewBySlug(slug);
  if (!preview) notFound();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <div className="flex items-center gap-3">
          <Sparkle size={14} weight="duotone" className="text-neutral-400" />
          <span className="font-mono text-xs text-neutral-500">
            preview · {preview.subtitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {PREVIEWS.map((p) => (
            <Link
              key={p.slug}
              href={`/preview/${p.slug}`}
              aria-current={p.slug === slug ? "page" : undefined}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                p.slug === slug
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {p.title}
            </Link>
          ))}
        </div>
      </nav>

      <header className="px-8 pt-10 pb-6">
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-neutral-900">
          {preview.title}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">{preview.tagline}</p>
      </header>

      <div className="flex-1 px-8 pb-8">
        <div className="h-[calc(100vh-220px)] min-h-[520px] w-full">
          <CausalGraphViewer graph={preview.graph} />
        </div>
      </div>
    </main>
  );
}
