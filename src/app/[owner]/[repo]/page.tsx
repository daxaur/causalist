import { notFound } from "next/navigation";
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
    <main className="flex min-h-[calc(100vh-57px)] flex-col bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-1 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 font-mono text-[12px] text-neutral-500">
          <span className="text-neutral-900">{owner}</span>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-900">{repo}</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-6 sm:px-6 lg:px-8">
        {cachedPreview ? (
          <div className="h-[calc(100vh-140px)] min-h-[560px] w-full">
            <CausalGraphViewer graph={cachedPreview.graph} />
          </div>
        ) : (
          <RepoAnalyzePrompt owner={owner} repo={repo} />
        )}
      </div>
    </main>
  );
}
