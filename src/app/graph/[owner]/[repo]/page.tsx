import Link from "next/link";
import { ArrowLeft, Graph, Sparkle } from "@phosphor-icons/react/dist/ssr";

export default async function GraphPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <div className="flex items-center gap-2">
          <Graph size={18} weight="duotone" />
          <span className="font-mono text-sm text-neutral-700">
            {owner}
            <span className="text-neutral-300">/</span>
            {repo}
          </span>
        </div>
        <div className="w-16" />
      </nav>

      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-8 py-32 text-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Sparkle
            size={20}
            weight="duotone"
            className="animate-pulse text-neutral-900"
          />
        </div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Mapping the repository
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-neutral-500">
          Claude agents are parsing the structure, resolving imports, and
          labeling every node. The 3D graph viewer will open here.
        </p>
        <div className="mt-8 font-mono text-xs text-neutral-400">
          graph viewer — coming day 3
        </div>
      </div>
    </main>
  );
}
