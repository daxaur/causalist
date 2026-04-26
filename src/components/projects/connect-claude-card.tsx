"use client";

// "Connect Claude Code" — the API-key-first onboarding card.
// Replaces the pair-code wizard as the primary CTA across the app.
// Three states:
//   - signed-out:  prompt to sign in with GitHub
//   - signed-in, no keys: one-tap "Generate key & copy install" CTA
//   - signed-in, has keys: show the install snippet with a fresh
//                          one-shot key the user can rotate
//
// All it ever asks the user to do is paste a single line into their
// terminal. No 6-char codes, no browser tabs to keep open.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  Copy,
  GithubLogo,
  Plus,
  Terminal,
  Warning,
} from "@phosphor-icons/react";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { API_KEYS_CHANGED_EVENT } from "@/hooks/use-api-key-status";
import { cn } from "@/lib/utils";

interface KeyRecord {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number;
}

interface Props {
  /** Compact = inline card on a wider page. Tall = full-bleed feature. */
  variant?: "compact" | "tall";
}

export function ConnectClaudeCard({ variant = "compact" }: Props) {
  const auth = useGithubAuth();
  const [keys, setKeys] = useState<KeyRecord[] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState<"key" | "snippet" | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.authenticated) return;
    try {
      const res = await fetch("/api/keys", { credentials: "same-origin" });
      const data = (await res.json()) as { keys?: KeyRecord[] };
      setKeys(data.keys ?? []);
    } catch {
      setKeys([]);
    }
  }, [auth.authenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onMint = async () => {
    setMinting(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "claude-code" }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error ?? `mint failed (${res.status})`);
      }
      const { token: t } = (await res.json()) as { token: string };
      setToken(t);
      void refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(API_KEYS_CHANGED_EVENT));
      }
    } catch (e) {
      toast.error("Couldn't create key", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setMinting(false);
    }
  };

  const copy = async (kind: "key" | "snippet", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    } catch {
      toast.error("Couldn't copy — select and ⌘C");
    }
  };

  const installSnippet = (key: string) => {
    return [
      "npm install -g causalist-cli",
      `causalist login --api-key ${key}`,
    ].join("\n");
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
        variant === "tall" && "p-6",
      )}
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/claude-code.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[15px] font-medium tracking-tight text-neutral-900">
              Connect Claude Code
            </h2>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700">
              new
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-500">
            Paste one line into any terminal. Claude Code can then create
            projects on your account, query your graphs, and write changes —
            all using your GitHub identity.
          </p>
        </div>
      </header>

      {!auth.authenticated ? (
        <SignInPrompt />
      ) : token ? (
        <FreshKeyPanel
          token={token}
          installSnippet={installSnippet(token)}
          copied={copied}
          onCopyKey={() => copy("key", token)}
          onCopySnippet={() => copy("snippet", installSnippet(token))}
          onDismiss={() => setToken(null)}
        />
      ) : keys && keys.length > 0 ? (
        <ExistingKeysHint
          count={keys.length}
          onRotate={onMint}
          minting={minting}
        />
      ) : (
        <FirstTimeCTA onMint={onMint} minting={minting} />
      )}
    </section>
  );
}

function SignInPrompt() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
      <p className="text-[12.5px] text-neutral-600">
        Sign in with GitHub first — your API keys are tied to your GitHub
        identity, scoped to your account only.
      </p>
      <a
        href="/api/auth/github/login"
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-3 text-[12.5px] text-white transition-colors hover:bg-neutral-800"
      >
        <GithubLogo size={13} weight="fill" />
        Sign in with GitHub
      </a>
    </div>
  );
}

function FirstTimeCTA({
  onMint,
  minting,
}: {
  onMint: () => void;
  minting: boolean;
}) {
  return (
    <div className="space-y-3">
      <ol className="space-y-2 text-[12.5px] text-neutral-700">
        <Step n={1}>
          Click <span className="font-medium">Generate install snippet</span>.
          We mint an API key tied to your account.
        </Step>
        <Step n={2}>
          Copy the two-line snippet and run it in any terminal that has
          Claude Code.
        </Step>
        <Step n={3}>
          Done. Ask Claude{" "}
          <em className="text-neutral-500">&ldquo;map vercel/swr for me&rdquo;</em>{" "}
          and it lands in your project list.
        </Step>
      </ol>
      <button
        type="button"
        onClick={onMint}
        disabled={minting}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-md bg-accent-magenta px-4 text-[13px] font-medium text-white transition-all",
          "hover:bg-accent-magenta/90 hover:shadow-[0_0_0_4px_rgba(232,56,164,0.15)]",
          minting && "opacity-50",
        )}
      >
        <Plus size={13} weight="bold" />
        {minting ? "Generating…" : "Generate install snippet"}
      </button>
    </div>
  );
}

function ExistingKeysHint({
  count,
  onRotate,
  minting,
}: {
  count: number;
  onRotate: () => void;
  minting: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-[12.5px] text-emerald-800">
        <Check size={13} weight="bold" />
        <span>
          You have <span className="font-medium">{count}</span> active API
          key{count === 1 ? "" : "s"}. Claude Code is ready to go.
        </span>
      </div>
      <p className="text-[12px] text-neutral-500">
        Lost the original snippet?{" "}
        <button
          type="button"
          onClick={onRotate}
          disabled={minting}
          className="font-medium text-accent-magenta underline-offset-2 hover:underline disabled:opacity-50"
        >
          {minting ? "Rotating…" : "Generate a fresh one"}
        </button>{" "}
        — your existing keys keep working.
      </p>
      <Link
        href="/app/settings"
        className="inline-flex h-8 items-center gap-1.5 text-[12px] text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        Manage keys in settings →
      </Link>
    </div>
  );
}

function FreshKeyPanel({
  token,
  installSnippet,
  copied,
  onCopyKey,
  onCopySnippet,
  onDismiss,
}: {
  token: string;
  installSnippet: string;
  copied: "key" | "snippet" | null;
  onCopyKey: () => void;
  onCopySnippet: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-accent-magenta/30 bg-accent-magenta/[0.04] p-3 text-[12px] text-neutral-900">
        <Warning
          size={13}
          weight="fill"
          className="mt-0.5 shrink-0 text-accent-magenta"
        />
        <div>
          <span className="font-medium">Copy now.</span> The full key is shown
          once. We only keep a hash. Lose it → mint a new one.
        </div>
      </div>

      {/* Two-line install snippet */}
      <div className="overflow-hidden rounded-lg border border-neutral-900 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            <Terminal size={11} weight="bold" />
            install snippet
          </span>
          <button
            type="button"
            onClick={onCopySnippet}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded px-2 text-[10.5px] font-medium transition-colors",
              copied === "snippet"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
            )}
          >
            {copied === "snippet" ? (
              <Check size={10} weight="bold" />
            ) : (
              <Copy size={10} />
            )}
            {copied === "snippet" ? "Copied" : "Copy snippet"}
          </button>
        </div>
        <pre className="overflow-x-auto px-3 py-3 font-mono text-[12px] leading-relaxed text-neutral-100">
{installSnippet}
        </pre>
      </div>

      <details className="rounded-lg border border-neutral-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-[11.5px] text-neutral-500 hover:bg-neutral-50">
          Or just the raw key
        </summary>
        <div className="flex items-center gap-2 border-t border-neutral-100 p-2">
          <code className="flex-1 select-all overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11.5px] text-neutral-900">
            {token}
          </code>
          <button
            type="button"
            onClick={onCopyKey}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors",
              copied === "key"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-neutral-900 text-white hover:bg-neutral-800",
            )}
          >
            {copied === "key" ? (
              <Check size={11} weight="bold" />
            ) : (
              <Copy size={11} />
            )}
            {copied === "key" ? "Copied" : "Copy"}
          </button>
        </div>
      </details>

      <button
        type="button"
        onClick={onDismiss}
        className="text-[11px] text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        I&rsquo;ve saved it — dismiss
      </button>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 font-mono text-[10px] text-neutral-500">
        {n}
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}
