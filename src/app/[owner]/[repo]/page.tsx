import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GearSix } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { PREVIEWS } from "@/lib/graph/previews";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { RepoAnalyzePrompt } from "@/components/graph/repo-analyze-prompt";

// Top-level route segments that must NOT be treated as repo owners.
const RESERVED_OWNERS = new Set([
  "api",
  "preview",
  "dashboard",
  "settings",
]);

function findCachedPreview(owner: string, repo: string) {
  return PREVIEWS.find((p) => {
    const [o, r] = p.graph.repo.split("/");
    return (
      o?.toLowerCase() === owner.toLowerCase() &&
      r?.toLowerCase() === repo.toLowerCase()
    );
  });
}

export default async function RepoGraphPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo: rawRepo } = await params;
  if (RESERVED_OWNERS.has(owner.toLowerCase())) notFound();
  const repo = rawRepo.replace(/\.git$/, "");

  const cachedPreview = findCachedPreview(owner, repo);

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
        <div className="flex items-center gap-2 text-neutral-900">
          <Logo size={18} />
          <span className="font-mono text-sm text-neutral-600">
            {owner}
            <span className="text-neutral-300"> / </span>
            {repo}
          </span>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          <GearSix size={15} />
        </Link>
      </nav>

      <div className="flex-1 p-4 sm:p-6">
        {cachedPreview ? (
          <div className="h-[calc(100vh-100px)] min-h-[560px] w-full">
            <CausalGraphViewer graph={cachedPreview.graph} />
          </div>
        ) : (
          <RepoAnalyzePrompt owner={owner} repo={repo} />
        )}
      </div>
    </main>
  );
}
