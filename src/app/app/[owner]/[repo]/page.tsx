import { notFound } from "next/navigation";
import { PREVIEWS } from "@/lib/graph/previews";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { RepoAnalyzePrompt } from "@/components/graph/repo-analyze-prompt";

// Top-level route segments that must NOT be treated as repo owners.
const RESERVED_OWNERS = new Set([
  "api",
  "app",
  "preview",
  "dashboard",
  "settings",
  "reference",
  "docs",
  "agents",
  "pair",
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

  // Fullscreen — the shell parent (<main class="relative flex-1
  // overflow-hidden"> from app-shell/left-sidebar.tsx) is our
  // canvas. No max-w-* wrappers, no top-nav math.
  return (
    <div className="absolute inset-0 flex flex-col bg-[#FAFAF8]">
      <div className="flex items-center justify-between border-b border-neutral-200/70 px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[12px] text-neutral-500">
          <span className="text-neutral-900">{owner}</span>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-900">{repo}</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {cachedPreview ? (
          <CausalGraphViewer graph={cachedPreview.graph} />
        ) : (
          <RepoAnalyzePrompt owner={owner} repo={repo} />
        )}
      </div>
    </div>
  );
}
