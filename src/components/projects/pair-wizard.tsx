"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  Copy,
  Terminal,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Phase = "install" | "code" | "paired";

/**
 * Three-step pair wizard. Triggered by any child element wrapped in
 * <PairWizard>...</PairWizard>. Walks the user through:
 *   1. Install the CLI (one command, copy button)
 *   2. Show the pair code from /api/pair, with "Run this in your
 *      terminal" — auto-advances when the server confirms claim
 *   3. Done — quick links into Projects + Connect Claude Code page
 */
export function PairWizard({ children }: { children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("install");
  const [code, setCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Mint a pair code when the user advances to step 2.
  useEffect(() => {
    if (!open) {
      setPhase("install");
      setCode(null);
      setSessionId(null);
      setPairing(false);
      esRef.current?.close();
      esRef.current = null;
      return;
    }
    if (phase !== "code" || code) return;
    let cancelled = false;
    fetch("/api/pair", { method: "POST" })
      .then((r) => r.json())
      .then((d: { code?: string; sessionId?: string }) => {
        if (cancelled) return;
        if (d.code) setCode(d.code);
        if (d.sessionId) setSessionId(d.sessionId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, phase, code]);

  // Subscribe to SSE — when the CLI claims the code, the server
  // publishes a "paired" event on the session channel. We flip to
  // the paired phase the moment we hear it.
  useEffect(() => {
    if (phase !== "code" || !sessionId) return;
    setPairing(true);
    const es = new EventSource(`/api/stream/${sessionId}`);
    esRef.current = es;
    const onPaired = () => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("causalist:pair:session", sessionId);
      }
      setPhase("paired");
      setPairing(false);
      es.close();
      esRef.current = null;
    };
    es.addEventListener("paired", onPaired);
    return () => {
      es.removeEventListener("paired", onPaired);
      es.close();
      if (esRef.current === es) esRef.current = null;
    };
  }, [phase, sessionId]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const installCmd = "npm i -g causalist-cli && causalist install";
  const pairCmd = code ? `causalist pair ${code}` : "causalist pair <code>";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none p-0 sm:max-w-none">
        <div className="overflow-hidden rounded-xl">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                <Terminal size={10} />
                Pair Claude Code
              </div>
              <DialogTitle className="mt-1 font-display text-[17px] font-medium tracking-tight">
                {phase === "install" && "Install the CLI"}
                {phase === "code" && "Run the pair command"}
                {phase === "paired" && "You're all set"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[11px] text-neutral-500">
                {phase === "install" && "One command. The CLI ships eleven graph-aware tools and a Claude Code skill."}
                {phase === "code" && "Copy this into a terminal where Claude Code can see it. We'll know when it ran."}
                {phase === "paired" && "This browser is paired. Claude Code can now query the graph and push projects to your list."}
              </DialogDescription>
            </div>
            <Stepper phase={phase} />
          </header>

          {/* Body */}
          <div className="bg-[#FAFAF8] px-5 py-5">
            {phase === "install" && (
              <div className="space-y-3">
                <CodeBlock
                  text={installCmd}
                  copied={copied === "install"}
                  onCopy={() => copy(installCmd, "install")}
                />
                <p className="text-[11.5px] leading-snug text-neutral-500">
                  This installs <code className="font-mono">causalist-cli</code> and
                  drops a <code className="font-mono">SKILL.md</code> into{" "}
                  <code className="font-mono">~/.claude/skills/causalist/</code>{" "}
                  — Claude Code auto-discovers it.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPhase("code")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    Continue
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}

            {phase === "code" && (
              <div className="space-y-3">
                {!code ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-neutral-200 bg-white py-8 text-[12px] text-neutral-500">
                    <CircleNotch size={12} className="animate-spin" />
                    Minting your pair code…
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-accent-magenta/30 bg-accent-magenta/[0.04] p-4 text-center">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-accent-magenta">
                        Your pair code
                      </div>
                      <div className="mt-1 font-mono text-[28px] font-medium tracking-[0.2em] text-neutral-900">
                        {code}
                      </div>
                      <div className="mt-1 text-[10.5px] text-neutral-500">
                        expires in 10 min · works once
                      </div>
                    </div>
                    <CodeBlock
                      text={pairCmd}
                      copied={copied === "pair"}
                      onCopy={() => copy(pairCmd, "pair")}
                    />
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      {pairing ? (
                        <span className="flex items-center gap-1.5 font-mono text-accent-magenta">
                          <CircleNotch size={11} className="animate-spin" />
                          Waiting for terminal…
                        </span>
                      ) : (
                        <span className="text-neutral-400">Run the command above.</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPhase("paired")}
                        className="text-[10px] text-neutral-400 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Already paired? Skip →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {phase === "paired" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-[12.5px] text-emerald-800">
                  <CheckCircle size={14} weight="fill" className="shrink-0 text-emerald-600" />
                  Claude Code is paired with this browser.
                </div>
                <p className="text-[11.5px] leading-snug text-neutral-500">
                  Try asking Claude Code: <em>&ldquo;what tests cover src/auth/login.ts in this repo?&rdquo;</em>{" "}
                  — it&rsquo;ll fire the skill and call{" "}
                  <code className="font-mono">causalist tests</code> instead of grepping.
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    Done
                    <CheckCircle size={11} weight="fill" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const idx = phase === "install" ? 0 : phase === "code" ? 1 : 2;
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1 w-5 rounded-full transition-colors",
            i <= idx ? "bg-accent-magenta" : "bg-neutral-200",
          )}
        />
      ))}
    </div>
  );
}

function CodeBlock({
  text,
  copied,
  onCopy,
}: {
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-neutral-900 px-3 py-2.5 pr-12 font-mono text-[12.5px] text-white">
        <span className="select-none text-neutral-500">$ </span>
        {text}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          "absolute right-2 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-1 rounded-md px-2 text-[10.5px] font-medium transition-all",
          copied
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
        )}
        aria-label={copied ? "copied" : "copy"}
      >
        {copied ? <CheckCircle size={11} weight="fill" /> : <Copy size={10} />}
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
