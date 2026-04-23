import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { getShare } from "@/lib/session/share-store";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) return { title: "Shared graph not found · Causalist" };
  const title = share.title ?? `${share.owner ?? ""}/${share.repo}`.replace(/^\//, "");
  return {
    title: `${title} · Causalist`,
    description: `Causal graph of ${share.repo}, ${share.graph.nodes.length} nodes · ${share.graph.edges.length} edges.`,
  };
}

export default async function SharedGraphPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) notFound();

  return (
    <main className="relative h-screen overflow-hidden bg-[#FAFAF8]">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-md border border-neutral-200 bg-white/90 px-2.5 py-1.5 text-[11px] text-neutral-700 backdrop-blur transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          <Logo size={14} />
          <span className="font-display font-medium">causalist</span>
          <span className="text-neutral-400">·</span>
          <span className="font-mono">{share.repo}</span>
        </Link>
        <Link
          href="/"
          className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800"
        >
          <Sparkle size={11} weight="fill" className="text-accent-magenta" />
          Map your own repo
          <ArrowRight size={11} />
        </Link>
      </header>

      <CausalGraphViewer graph={share.graph} />
    </main>
  );
}
