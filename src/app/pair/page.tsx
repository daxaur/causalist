"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  CircleNotch,
  Copy,
  Terminal as TerminalIcon,
} from "@phosphor-icons/react";
import { PageShell } from "@/components/layout/page-shell";

type Phase = "loading" | "awaiting" | "paired" | "expired";

export default function PairPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [code, setCode] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [copied, setCopied] = useState<"curl" | "cli" | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const mint = async () => {
      try {
        const res = await fetch("/api/pair", { method: "POST" });
        if (!res.ok) throw new Error("mint failed");
        const data = (await res.json()) as { code: string; sessionId: string };
        if (cancelled) return;
        setCode(data.code);
        setSessionId(data.sessionId);
        setPhase("awaiting");

        const es = new EventSource(`/api/stream/${data.sessionId}`);
        esRef.current = es;
        es.addEventListener("tool", (e) => {
          try {
            const payload = JSON.parse((e as MessageEvent<string>).data);
            if (payload.event === "paired") {
              setPhase("paired");
              es.close();
            }
          } catch {
            // ignore
          }
        });
      } catch {
        if (!cancelled) setPhase("expired");
      }
    };
    mint();
    return () => {
      cancelled = true;
      esRef.current?.close();
    };
  }, []);

  const copyCurl = async () => {
    if (!code) return;
    const cmd = `curl -sSL 'https://causalist.xyz/api/pair/setup?code=${code}' | sh`;
    await navigator.clipboard.writeText(cmd);
    setCopied("curl");
    setTimeout(() => setCopied(null), 1500);
  };

  const copyCli = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(`causalist pair ${code}`);
    setCopied("cli");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <PageShell width="form">
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 text-neutral-500"
            >
              <CircleNotch size={18} className="animate-spin" />
              <span className="text-sm">Minting pair code…</span>
            </motion.div>
          )}

          {phase === "awaiting" && (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex w-full max-w-xl flex-col items-center gap-6"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                  Pair this tab with your terminal
                </p>
                <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-[-0.02em] sm:text-4xl">
                  One command. No install.
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">
                  Claude Code tool-use events stream into this tab the moment
                  the command below runs. The 6-char code expires in 10 minutes
                  and works once.
                </p>
              </div>

              <button
                onClick={copyCurl}
                className="group w-full overflow-hidden rounded-xl border-2 border-accent-magenta/60 bg-white p-5 text-left transition-all hover:border-accent-magenta hover:shadow-[0_0_0_4px_rgba(232,56,164,0.08)]"
              >
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="font-mono uppercase tracking-wider text-accent-magenta">
                    Recommended · no install
                  </span>
                  <span className="font-mono text-neutral-400">
                    {copied === "curl" ? "copied" : "click to copy"}
                  </span>
                </div>
                <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-neutral-800">
                  <span className="text-neutral-400">$ </span>
                  curl -sSL &apos;https://causalist.xyz/api/pair/setup?code=
                  <span className="text-accent-magenta">{code}</span>
                  &apos; | sh
                </pre>
              </button>

              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
                <CircleNotch size={10} className="animate-spin" />
                Waiting for pair…
              </div>

              <details className="w-full text-left text-xs text-neutral-500">
                <summary className="cursor-pointer hover:text-neutral-700">
                  Or use the Causalist CLI
                </summary>
                <button
                  onClick={copyCli}
                  className="mt-3 flex w-full items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-[12px] text-neutral-700 hover:border-neutral-300"
                >
                  <span>
                    <TerminalIcon
                      size={11}
                      className="mr-1.5 inline-block align-[-1px] text-accent-magenta"
                    />
                    causalist pair {code}
                  </span>
                  {copied === "cli" ? (
                    <CheckCircle
                      size={12}
                      weight="fill"
                      className="text-emerald-500"
                    />
                  ) : (
                    <Copy size={11} className="text-neutral-400" />
                  )}
                </button>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Requires <code className="font-mono">npm install -g causalist</code>.
                </p>
              </details>
            </motion.div>
          )}

          {phase === "paired" && (
            <motion.div
              key="paired"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50">
                <CheckCircle
                  size={26}
                  weight="fill"
                  className="text-emerald-500"
                />
              </div>
              <div>
                <h1 className="font-display text-3xl font-medium tracking-[-0.02em]">
                  Paired
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
                  Tool-use events from this terminal session will stream here
                  automatically.
                </p>
                <p className="mt-3 font-mono text-[11px] text-neutral-400">
                  session · {sessionId.slice(0, 8)}…
                </p>
              </div>
              <Link
                href="/app"
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
              >
                Open dashboard
              </Link>
            </motion.div>
          )}

          {phase === "expired" && (
            <motion.div
              key="expired"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <h1 className="font-display text-2xl font-medium tracking-[-0.02em]">
                Couldn&rsquo;t mint a code
              </h1>
              <p className="max-w-sm text-sm text-neutral-500">
                Refresh the page to try again.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
