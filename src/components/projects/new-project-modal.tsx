"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  GithubLogo,
  Terminal,
  Warning,
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

type UrlState =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "checking"; owner: string; repo: string }
  | { kind: "valid"; owner: string; repo: string; stars: number; lang?: string }
  | { kind: "missing"; owner: string; repo: string }
  | { kind: "private"; owner: string; repo: string };

/**
 * New-project modal — URL tab now feels alive: type a URL, see the
 * format checked instantly, then a real GitHub HEAD lookup confirms
 * the repo exists and surfaces the language + star count. Failure
 * states (404, private/auth) get their own friendly micro-copy.
 */
export function NewProjectModal({ children }: { children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"url" | "pair">("url");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const [repoUrl, setRepoUrl] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [urlState, setUrlState] = useState<UrlState>({ kind: "empty" });

  // Format-check is synchronous and runs every keystroke; the GitHub
  // existence check debounces to 450ms after the user stops typing.
  const parsed = useMemo(() => {
    const m = repoUrl.trim().match(GITHUB_URL);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  }, [repoUrl]);

  useEffect(() => {
    if (!repoUrl.trim()) {
      setUrlState({ kind: "empty" });
      return;
    }
    if (!parsed) {
      setUrlState({ kind: "invalid" });
      return;
    }
    setUrlState({ kind: "checking", ...parsed });
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
          {
            headers: { Accept: "application/vnd.github+json" },
            signal: ac.signal,
          },
        );
        if (res.status === 404) {
          setUrlState({ kind: "missing", ...parsed });
          return;
        }
        if (res.status === 403 || res.status === 401) {
          setUrlState({ kind: "private", ...parsed });
          return;
        }
        if (!res.ok) {
          setUrlState({ kind: "invalid" });
          return;
        }
        const data = (await res.json()) as {
          stargazers_count?: number;
          language?: string;
        };
        setUrlState({
          kind: "valid",
          ...parsed,
          stars: data.stargazers_count ?? 0,
          lang: data.language ?? undefined,
        });
      } catch {
        // network blip / cancelled — leave UI in checking until next keypress
      }
    }, 450);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [repoUrl, parsed]);

  const canAnalyze = urlState.kind === "valid" || urlState.kind === "private";

  const handleAnalyze = () => {
    if (!canAnalyze || !parsed) return;
    setSubmitting(true);
    setOpen(false);
    // Stash the nickname so the analyze flow can use it as the
    // friendly name on the projects list (the library store reads
    // this on save).
    if (nickname.trim() && typeof window !== "undefined") {
      window.localStorage.setItem(
        `causalist:nickname:${parsed.owner}/${parsed.repo}`,
        nickname.trim(),
      );
    }
    router.push(`/app/${parsed.owner}/${parsed.repo}`);
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
              Drop in a GitHub URL — we&rsquo;ll check it&rsquo;s real, then map it.
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
              <div className="space-y-4">
                {/* URL field with live status */}
                <div>
                  <label
                    htmlFor="repo-url"
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400"
                  >
                    Repo URL
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      id="repo-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      autoFocus
                      placeholder="https://github.com/owner/repo"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && canAnalyze && handleAnalyze()
                      }
                      className={cn(
                        "h-11 border-neutral-200 bg-white pr-10 font-mono text-sm transition-colors",
                        urlState.kind === "valid" && "border-emerald-300",
                        (urlState.kind === "invalid" ||
                          urlState.kind === "missing") &&
                          "border-red-300",
                      )}
                      aria-invalid={
                        urlState.kind === "invalid" || urlState.kind === "missing"
                          ? "true"
                          : "false"
                      }
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <UrlStatusGlyph state={urlState.kind} />
                    </div>
                  </div>
                  <UrlStatusLine state={urlState} />
                </div>

                {/* Optional nickname — only show once we have a valid URL */}
                <AnimatePresence>
                  {(urlState.kind === "valid" ||
                    urlState.kind === "private") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <label
                        htmlFor="proj-name"
                        className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400"
                      >
                        Name (optional)
                      </label>
                      <Input
                        id="proj-name"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={`${urlState.owner}/${urlState.repo}`}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && canAnalyze && handleAnalyze()
                        }
                        className="mt-1.5 h-10 border-neutral-200 bg-white text-sm"
                      />
                      <p className="mt-1 text-[10.5px] text-neutral-400">
                        Shown in your Projects list. Defaults to{" "}
                        <code className="font-mono">owner/repo</code>.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action row */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10.5px] text-neutral-400">
                    Need a key?{" "}
                    <Link
                      href="/app/settings"
                      className="underline underline-offset-2 hover:text-neutral-700"
                    >
                      Add Anthropic in settings
                    </Link>
                    .
                  </p>
                  <Button
                    onClick={handleAnalyze}
                    disabled={submitting || !canAnalyze}
                    className={cn(
                      "h-10 px-4 text-white transition-all",
                      canAnalyze
                        ? "bg-accent-magenta hover:bg-accent-magenta/90 hover:shadow-[0_0_0_4px_rgba(232,56,164,0.15)]"
                        : "bg-neutral-900 hover:bg-neutral-800",
                    )}
                  >
                    Map it
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </div>
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

function UrlStatusGlyph({ state }: { state: UrlState["kind"] }) {
  if (state === "checking") {
    return (
      <CircleNotch size={14} className="animate-spin text-neutral-400" />
    );
  }
  if (state === "valid") {
    return (
      <motion.div
        key="valid"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      >
        <CheckCircle size={16} weight="fill" className="text-emerald-500" />
      </motion.div>
    );
  }
  if (state === "missing" || state === "invalid") {
    return (
      <motion.div
        key="warn"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
      >
        <Warning size={14} weight="fill" className="text-red-500" />
      </motion.div>
    );
  }
  if (state === "private") {
    return (
      <CheckCircle size={16} weight="fill" className="text-amber-500" />
    );
  }
  return null;
}

function UrlStatusLine({ state }: { state: UrlState }) {
  if (state.kind === "empty") {
    return (
      <p className="mt-1.5 text-[11px] text-neutral-400">
        Public or private — we&rsquo;ll check before mapping.
      </p>
    );
  }
  if (state.kind === "invalid") {
    return (
      <p className="mt-1.5 text-[11px] text-red-500">
        That doesn&rsquo;t look like a github.com URL.
      </p>
    );
  }
  if (state.kind === "checking") {
    return (
      <p className="mt-1.5 font-mono text-[11px] text-neutral-500">
        Checking <span className="text-neutral-700">{state.owner}/{state.repo}</span>…
      </p>
    );
  }
  if (state.kind === "missing") {
    return (
      <p className="mt-1.5 text-[11px] text-red-500">
        <span className="font-mono">{state.owner}/{state.repo}</span> doesn&rsquo;t
        exist on GitHub.
      </p>
    );
  }
  if (state.kind === "private") {
    return (
      <p className="mt-1.5 text-[11px] text-amber-700">
        Looks private. We can still map it if you sign in with a GitHub
        token that has read access.
      </p>
    );
  }
  return (
    <motion.p
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-emerald-700"
    >
      <span className="font-medium">Found.</span>
      <span className="font-mono text-neutral-700">
        {state.owner}/{state.repo}
      </span>
      <span className="text-neutral-300">·</span>
      <span className="text-neutral-500">
        {state.stars.toLocaleString()} ★
        {state.lang && <> · {state.lang}</>}
      </span>
    </motion.p>
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
