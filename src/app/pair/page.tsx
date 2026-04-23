"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  Copy,
  Terminal as TerminalIcon,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";

type Phase = "loading" | "awaiting" | "paired" | "expired";

export default function PairPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [code, setCode] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [copied, setCopied] = useState(false);
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

        // Subscribe to the stream — when the CLI claims the code, the
        // server publishes a "paired" event.
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

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={18} />
          <span className="font-display text-sm font-medium tracking-tight">
            pair
          </span>
        </Link>
        <div className="w-16" />
      </nav>

      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
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
              className="flex max-w-lg flex-col items-center gap-6"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                  Pair this tab with your CLI
                </p>
                <h1 className="mt-3 font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-neutral-900 sm:text-4xl">
                  Run this in your terminal
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">
                  Claude Code and any agent with shell access will be able to
                  stream tool-use events into this browser tab. Your session
                  id stays on your device.
                </p>
              </div>

              <button
                onClick={copy}
                className="group flex items-center gap-3 rounded-xl border border-neutral-900 bg-neutral-900 px-5 py-3 font-mono text-white transition-all hover:bg-neutral-800"
                title="Copy command"
              >
                <TerminalIcon
                  size={15}
                  weight="duotone"
                  className="text-[#E838A4]"
                />
                <span className="text-sm">
                  <span className="text-neutral-400">$ </span>
                  causalist pair{" "}
                  <span className="text-[#FF9CD9]">{code}</span>
                </span>
                {copied ? (
                  <CheckCircle
                    size={13}
                    weight="fill"
                    className="text-emerald-400"
                  />
                ) : (
                  <Copy
                    size={13}
                    className="text-neutral-400 transition-colors group-hover:text-white"
                  />
                )}
              </button>

              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500">
                <CircleNotch size={10} className="animate-spin" />
                Waiting for pair… expires in 10 minutes.
              </div>

              <details className="text-left text-xs text-neutral-500">
                <summary className="cursor-pointer hover:text-neutral-700">
                  Don&rsquo;t have the CLI yet?
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11px] text-neutral-700">
{`npm install -g causalist
causalist pair ${code}`}
                </pre>
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
                <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-neutral-900">
                  Paired
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
                  Claude Code tool-use events from this terminal session will
                  now stream into the browser tab that opens next.
                </p>
                <p className="mt-3 font-mono text-[11px] text-neutral-400">
                  session · {sessionId.slice(0, 8)}…
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
              >
                Back to home
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
    </main>
  );
}
