"use client";

import { useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  GithubLogo,
  Sparkle,
  Terminal,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;

/**
 * Single, focused entry point for spinning up a new project. Two tabs:
 *  - "From GitHub URL" — paste any public repo URL and route to the
 *    analyze flow (`/app/<owner>/<repo>`).
 *  - "Pair your terminal" — show how to wire Claude Code to push graphs
 *    into the user's projects list directly via the MCP server.
 */
export function NewProjectModal({ children }: { children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"url" | "pair">("url");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Open automatically when the sidebar links here with ?new=1 — the
  // url query is the cheapest cross-component channel for "open me."
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAnalyze = () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) return;
    const match = trimmed.match(GITHUB_URL);
    if (!match) {
      setError("Enter a valid GitHub URL — github.com/owner/repo");
      return;
    }
    const [, owner, repo] = match;
    setError(null);
    setSubmitting(true);
    setOpen(false);
    router.push(`/app/${owner}/${repo.replace(/\.git$/, "")}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="w-[min(540px,calc(100vw-2rem))] max-w-none p-0 sm:max-w-none">
        <div className="overflow-hidden rounded-xl">
          <header className="border-b border-neutral-100 bg-white px-5 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              New project
            </div>
            <DialogTitle className="mt-1 font-display text-[18px] font-medium tracking-tight">
              Map a codebase
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-neutral-500">
              Drop in a GitHub URL — Claude agents read it and build a causal
              graph you can actually navigate.
            </DialogDescription>
          </header>

          {/* Tabs */}
          <div className="flex border-b border-neutral-100 px-2">
            <TabBtn
              active={tab === "url"}
              onClick={() => setTab("url")}
              icon={<GithubLogo size={12} weight="fill" />}
              label="From GitHub URL"
            />
            <TabBtn
              active={tab === "pair"}
              onClick={() => setTab("pair")}
              icon={<Terminal size={12} weight="duotone" />}
              label="Pair your terminal"
            />
          </div>

          <div className="bg-[#FAFAF8] px-5 py-5">
            {tab === "url" ? (
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                  Paste a repo URL
                </label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !submitting && handleAnalyze()
                    }
                    className="h-11 border-neutral-200 bg-white font-mono text-sm"
                    aria-invalid={error ? "true" : "false"}
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={submitting || !repoUrl.trim()}
                    className="h-11 bg-neutral-900 px-4 text-white hover:bg-neutral-800"
                  >
                    Analyze
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </div>
                {error && (
                  <p className="mt-2 text-[11px] text-red-500">{error}</p>
                )}
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <Sparkle
                    size={10}
                    weight="fill"
                    className="text-accent-magenta"
                  />
                  Four Claude Opus 4.7 agents — Structure, Dependency, Semantic,
                  Oracle — run in parallel.
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Need a key?{" "}
                  <Link
                    href="/app/settings"
                    className="underline underline-offset-2 hover:text-neutral-700"
                  >
                    Add it in settings
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[12px] text-neutral-600">
                  Run Causalist alongside your editor — Claude Code can push
                  new projects straight into this list via the MCP server.
                </p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-neutral-200 bg-white p-3 font-mono text-[11px] text-neutral-700">
                  {`# 1. grab a pair code at /pair\n\n# 2. wire the MCP server into Claude Code\n#    (no npm install — npx fetches it)\nclaude mcp add causalist -- \\\n  npx -y causalist-mcp@latest --session YOUR_CODE`}
                </pre>
                <Link
                  href="/app/claude-code"
                  className="mt-3 inline-flex items-center gap-1 text-[12px] text-accent-magenta hover:underline"
                >
                  Full setup walkthrough
                  <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactElement;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 px-4 py-3 text-[12px] transition-colors",
        active ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      <span className={active ? "text-accent-magenta" : "text-neutral-400"}>
        {icon}
      </span>
      {label}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent-magenta" />
      )}
    </button>
  );
}
