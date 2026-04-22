"use client";

import { useState } from "react";
import { ArrowRight, GithubLogo, Graph, Star } from "@phosphor-icons/react";
import { ConstellationBackground } from "@/components/landing/constellation-bg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleExplore = () => {
    if (!repoUrl.trim()) return;
    setIsLoading(true);
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (match) {
      window.location.href = `/graph/${match[1]}/${match[2]}`;
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ConstellationBackground />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <Graph size={24} weight="duotone" className="text-neutral-900" />
          <span className="text-lg font-semibold tracking-tight">
            cartograph
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/CTRLabs/cartograph"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <GithubLogo size={20} weight="fill" />
            <span>Star</span>
            <Star size={14} weight="fill" className="text-amber-400" />
          </a>
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-8 pt-24 pb-32">
        <div className="mb-8 rounded-full border border-neutral-200 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-xs text-neutral-500 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Built for the Claude Opus 4.7 Hackathon
        </div>

        <h1 className="max-w-3xl text-center text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          See what your code{" "}
          <span className="bg-gradient-to-r from-neutral-900 via-neutral-600 to-neutral-400 bg-clip-text text-transparent">
            actually means
          </span>
        </h1>

        <p className="max-w-xl text-center text-lg text-neutral-500 mb-12 leading-relaxed">
          Paste a GitHub URL. Claude agents map your entire codebase into a 3D
          causal graph. Explore the architecture, understand connections, review
          PRs visually.
        </p>

        <div className="flex w-full max-w-lg gap-3">
          <Input
            type="url"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExplore()}
            className="h-12 text-base bg-white/80 backdrop-blur-sm border-neutral-200 placeholder:text-neutral-400"
          />
          <Button
            onClick={handleExplore}
            disabled={isLoading || !repoUrl.trim()}
            className="h-12 px-6 bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            {isLoading ? (
              <span className="animate-pulse">Mapping...</span>
            ) : (
              <>
                Explore
                <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-neutral-400">
          <span>Try:</span>
          {["vercel/next.js", "pallets/flask", "CTRLabs/tracey"].map(
            (repo, i) => (
              <span key={repo}>
                {i > 0 && <span className="mr-3">·</span>}
                <button
                  onClick={() =>
                    setRepoUrl(`https://github.com/${repo}`)
                  }
                  className="underline underline-offset-2 hover:text-neutral-600 transition-colors"
                >
                  {repo.split("/")[1]}
                </button>
              </span>
            )
          )}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 pb-24">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="3D causal graph"
            description="Navigate your codebase like Google Earth. Zoom from architecture overview down to individual functions."
          />
          <FeatureCard
            title="PR blast radius"
            description="See what a pull request actually affects — not just the diff, but the full cascade through your system."
          />
          <FeatureCard
            title="Ask anything"
            description='Click any node. Ask "what does this do?" or "what breaks if I change this?" Claude answers with graph context.'
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-100 px-8 py-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between text-sm text-neutral-400">
          <span>cartograph — by CTRLabs</span>
          <span>Built with Claude Code</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-neutral-200 bg-white/60 backdrop-blur-sm p-6 hover:border-neutral-300 hover:shadow-sm transition-all">
      <h3 className="font-semibold text-base mb-2 group-hover:text-neutral-900 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
    </div>
  );
}
