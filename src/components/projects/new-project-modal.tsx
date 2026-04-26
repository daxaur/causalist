"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  CircleNotch,
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
import { ModelPill } from "@/components/agents/model-pill";
import { BUILDER_AGENTS, type BuilderAgentId } from "@/lib/analyze/prompts";
import { stdTransition } from "@/lib/motion";

const DEFAULT_MODEL = "claude-opus-4-7";
const MODELS_LS_KEY = "causalist:builder-models:v1";

type ModelMap = Record<BuilderAgentId, string>;

function defaultModels(): ModelMap {
  return {
    structure: DEFAULT_MODEL,
    dependency: DEFAULT_MODEL,
    semantic: DEFAULT_MODEL,
    oracle: DEFAULT_MODEL,
  };
}

function readModels(): ModelMap {
  if (typeof window === "undefined") return defaultModels();
  try {
    const raw = window.localStorage.getItem(MODELS_LS_KEY);
    if (!raw) return defaultModels();
    const p = JSON.parse(raw) as Partial<ModelMap>;
    return {
      structure: p.structure ?? DEFAULT_MODEL,
      dependency: p.dependency ?? DEFAULT_MODEL,
      semantic: p.semantic ?? DEFAULT_MODEL,
      oracle: p.oracle ?? DEFAULT_MODEL,
    };
  } catch {
    return defaultModels();
  }
}

function writeModels(m: ModelMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODELS_LS_KEY, JSON.stringify(m));
  } catch {
    // ignore quota errors
  }
}

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;

type UrlState =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "checking"; owner: string; repo: string }
  | { kind: "valid"; owner: string; repo: string; stars: number; lang?: string }
  | { kind: "missing"; owner: string; repo: string }
  | { kind: "private"; owner: string; repo: string };

/**
 * New-project modal — single focused form: an optional friendly name
 * up top, then the GitHub URL with live validation (format check on
 * every keystroke, debounced GitHub HEAD lookup confirms the repo
 * exists, surfaces stars + primary language). Connecting Claude Code
 * lives elsewhere (the ConnectClaudeCard on the Projects page) — this
 * modal is single-purpose: spin up a new graph from a URL.
 */
export function NewProjectModal({ children }: { children: ReactElement }) {
  const [open, setOpen] = useState(false);
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [models, setModels] = useState<ModelMap>(() => defaultModels());

  // Hydrate models from localStorage on mount (avoids SSR/CSR mismatch).
  useEffect(() => {
    setModels(readModels());
  }, []);

  const setModel = (id: BuilderAgentId, model: string) => {
    setModels((prev) => {
      const next = { ...prev, [id]: model };
      writeModels(next);
      return next;
    });
  };

  const advancedSummary = useMemo(() => {
    const distinct = new Set(Object.values(models));
    if (distinct.size === 1) {
      const only = [...distinct][0];
      const label = only === DEFAULT_MODEL ? "Opus 4.7" : modelLabel(only);
      return `4 agents · ${label}`;
    }
    return `${distinct.size} models in mix`;
  }, [models]);

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

          <div className="space-y-4 bg-[#FAFAF8] px-5 py-5">
            {/* Optional name — visible upfront so the user can think of
                it as "their" project before the URL is even validated. */}
            <div>
              <label
                htmlFor="proj-name"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400"
              >
                Project name <span className="text-neutral-300">· optional</span>
              </label>
              <Input
                id="proj-name"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  urlState.kind === "valid" || urlState.kind === "private"
                    ? `${urlState.owner}/${urlState.repo}`
                    : "e.g. payments-service"
                }
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && canAnalyze && handleAnalyze()
                }
                className="mt-1.5 h-10 border-neutral-200 bg-white text-sm"
              />
            </div>

            {/* GitHub URL with live status */}
            <div>
              <label
                htmlFor="repo-url"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400"
              >
                GitHub URL
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

            {/* Advanced — per-agent model assignment for the 4 builders */}
            <div className="rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
              >
                <span className="flex items-center gap-2">
                  <CaretDown
                    size={11}
                    className={cn(
                      "text-neutral-400 transition-transform",
                      advancedOpen && "rotate-180",
                    )}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    Advanced
                  </span>
                  <span className="font-mono text-[11px] text-neutral-400">
                    · {advancedSummary}
                  </span>
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  {advancedOpen ? "hide" : "configure"}
                </span>
              </button>
              {advancedOpen && (
                <div className="space-y-1.5 border-t border-neutral-100 px-3 py-2.5">
                  {BUILDER_AGENTS.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: a.color }}
                        />
                        <span className="font-display text-[12.5px] font-medium text-neutral-900">
                          {a.name}
                        </span>
                        <span className="truncate font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                          {a.role}
                        </span>
                      </div>
                      <ModelPill
                        size="sm"
                        value={models[a.id]}
                        onChange={(m) => setModel(a.id, m)}
                      />
                    </div>
                  ))}
                  <p className="pt-1 text-[10.5px] text-neutral-400">
                    Each builder agent runs concurrently. Defaults to Opus 4.7.
                  </p>
                </div>
              )}
            </div>

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
        transition={stdTransition}
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
        transition={stdTransition}
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

function modelLabel(id: string): string {
  if (id === "claude-opus-4-7") return "Opus 4.7";
  if (id === "claude-sonnet-4-6") return "Sonnet 4.6";
  if (id === "claude-haiku-4-5") return "Haiku 4.5";
  return id;
}

