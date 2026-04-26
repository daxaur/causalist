"use client";

// Shared "you just minted a key, here's what to do with it" panel.
// Used by ConnectClaudeCard (the onboarding card across /app, /app/profile,
// /app/claude-code) AND by ApiKeysPanel in /app/settings, so the user
// always sees the same install snippet + concrete prompts no matter
// which surface they minted from.

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Terminal, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface Props {
  token: string;
  onDismiss?: () => void;
}

export function FreshKeyReveal({ token, onDismiss }: Props) {
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);

  const installSnippet = `npm install -g causalist-cli\ncausalist login --api-key ${token}`;

  const copy = async (kind: "key" | "snippet", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    } catch {
      toast.error("Couldn't copy — select and ⌘C");
    }
  };

  return (
    <div className="space-y-4">
      {/* Warning + intent */}
      <div className="flex items-start gap-3 rounded-xl border border-accent-magenta/30 bg-accent-magenta/[0.04] p-4">
        <Warning
          size={18}
          weight="fill"
          className="mt-0.5 shrink-0 text-accent-magenta"
        />
        <div className="text-[14.5px] text-neutral-900">
          <div className="font-semibold">Copy this now.</div>
          <p className="mt-1 leading-relaxed text-neutral-600">
            The full key is shown <em>once</em>. We only keep its hash. If you
            lose it, mint a fresh one — your existing keys keep working.
          </p>
        </div>
      </div>

      {/* Two-line install snippet */}
      <div className="overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            <Terminal size={13} weight="bold" />
            Paste into your terminal
          </span>
          <button
            type="button"
            onClick={() => copy("snippet", installSnippet)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors",
              copied === "snippet"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700",
            )}
          >
            {copied === "snippet" ? (
              <Check size={12} weight="bold" />
            ) : (
              <Copy size={12} />
            )}
            {copied === "snippet" ? "Copied" : "Copy snippet"}
          </button>
        </div>
        <pre className="overflow-x-auto px-4 py-4 font-mono text-[14px] leading-relaxed text-neutral-100">
{installSnippet}
        </pre>
      </div>

      {/* Raw key disclosure */}
      <details className="rounded-lg border border-neutral-200 bg-white">
        <summary className="cursor-pointer px-4 py-2.5 text-[13px] text-neutral-600 hover:bg-neutral-50">
          Or just the raw key
        </summary>
        <div className="flex items-center gap-2 border-t border-neutral-100 p-3">
          <code className="flex-1 select-all overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] text-neutral-900">
            {token}
          </code>
          <button
            type="button"
            onClick={() => copy("key", token)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors",
              copied === "key"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-neutral-900 text-white hover:bg-neutral-800",
            )}
          >
            {copied === "key" ? (
              <Check size={12} weight="bold" />
            ) : (
              <Copy size={12} />
            )}
            {copied === "key" ? "Copied" : "Copy"}
          </button>
        </div>
      </details>

      {/* Now what — concrete prompts the user can paste into Claude Code */}
      <NextSteps />

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[13px] text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          I&rsquo;ve saved it — dismiss
        </button>
      )}
    </div>
  );
}

function NextSteps() {
  const prompts = [
    "Map vercel/swr as a Causalist project for me.",
    "What breaks if I change src/lib/auth.ts in this repo?",
    "Which tests cover the changes in my last 3 commits?",
  ];
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check size={14} weight="bold" />
        </span>
        <h3 className="font-display text-[16px] font-medium tracking-tight text-neutral-900">
          Now open Claude Code and try this
        </h3>
      </div>
      <p className="mb-4 text-[14.5px] leading-relaxed text-neutral-600">
        After you paste the snippet above, run{" "}
        <code className="rounded bg-neutral-200/60 px-1.5 py-0.5 font-mono text-[13px] text-neutral-900">
          claude
        </code>{" "}
        in any terminal — Claude Code is now wired to your account. Try one of
        these prompts. New projects appear in your projects list automatically.
      </p>
      <ul className="space-y-2">
        {prompts.map((p) => (
          <li
            key={p}
            className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[14px] leading-snug text-neutral-700"
          >
            <span className="mt-0.5 font-mono text-[13px] text-accent-magenta">
              ›
            </span>
            <span className="italic">{p}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-neutral-500">
        Don&rsquo;t have Claude Code yet?{" "}
        <a
          href="https://docs.claude.com/en/docs/claude-code/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
        >
          Install it from docs.claude.com
        </a>
        .
      </p>
    </div>
  );
}
