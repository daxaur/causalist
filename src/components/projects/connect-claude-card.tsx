"use client";

// "Connect Claude Code" — the API-key-first onboarding card.
// Replaces the pair-code wizard as the primary CTA across the app.
// Three states:
//   - signed-out:  prompt to sign in with GitHub
//   - signed-in, no keys: explain WHY, then a single "Generate" CTA
//   - signed-in, has keys: confirmation + how to rotate

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  GithubLogo,
  Plus,
  Warning,
} from "@phosphor-icons/react";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { API_KEYS_CHANGED_EVENT } from "@/hooks/use-api-key-status";
import { FreshKeyReveal } from "@/components/agents/fresh-key-reveal";
import { cn } from "@/lib/utils";

interface KeyRecord {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number;
}

interface PersistenceStatus {
  persistence: "supabase" | "memory";
  ok: boolean;
  reason?: string;
  message?: string;
}

interface Props {
  /** compact = inline on a wider page · tall = full-bleed feature */
  variant?: "compact" | "tall";
}

export function ConnectClaudeCard({ variant = "compact" }: Props) {
  const auth = useGithubAuth();
  const [keys, setKeys] = useState<KeyRecord[] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [persistence, setPersistence] = useState<PersistenceStatus | null>(null);

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
    fetch("/api/keys/status")
      .then((r) => r.json())
      .then((d: PersistenceStatus) => setPersistence(d))
      .catch(() => setPersistence(null));
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

  const installSnippet = (key: string) =>
    `npm install -g causalist-cli\ncausalist login --api-key ${key}`;

  const ephemeral =
    persistence !== null && persistence.persistence === "memory";

  return (
    <section
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white",
        variant === "tall" ? "p-7" : "p-6",
      )}
    >
      {/* Header — bigger, with what-this-actually-is in plain English */}
      <header className="mb-5 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/claude-code.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-medium tracking-tight text-neutral-900">
              Let Claude Code use your graphs
            </h2>
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600">
            Causalist turns any GitHub repo into a typed causal graph — the
            kind agents can <em>reason</em> over instead of grepping. Connect
            Claude Code to your account once and it can map new repos, trace
            blast radius, and answer questions about your codebase from any
            terminal.
          </p>
        </div>
      </header>

      {/* Persistence warning — only when keys won't survive a restart */}
      {ephemeral && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/70 p-4">
          <Warning
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div className="text-[14px] text-amber-900">
            <div className="font-semibold">
              Keys aren&rsquo;t persisting yet.
            </div>
            <p className="mt-1 leading-relaxed">
              {persistence?.reason === "table_missing" ? (
                <>
                  Supabase is configured but the{" "}
                  <code className="rounded bg-amber-100 px-1 py-px font-mono text-[12.5px]">
                    causalist_api_keys
                  </code>{" "}
                  table is missing. Run the migration in{" "}
                  <code className="font-mono text-[12.5px]">SETUP.md</code> and
                  refresh.
                </>
              ) : (
                <>
                  This server is running without Supabase, so any key you mint
                  here lives in process memory and disappears on the next
                  request. Set{" "}
                  <code className="rounded bg-amber-100 px-1 py-px font-mono text-[12.5px]">
                    SUPABASE_SERVICE_ROLE_KEY
                  </code>{" "}
                  +{" "}
                  <code className="rounded bg-amber-100 px-1 py-px font-mono text-[12.5px]">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  and run the migration in{" "}
                  <code className="font-mono text-[12.5px]">SETUP.md</code>.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {!auth.authenticated ? (
        <SignInPrompt />
      ) : token ? (
        <FreshKeyReveal token={token} onDismiss={() => setToken(null)} />
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
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5">
      <p className="text-[15px] leading-relaxed text-neutral-700">
        Sign in with GitHub first. Your API keys are tied to your GitHub
        identity, so projects an agent creates show up under{" "}
        <em>your</em> account.
      </p>
      <a
        href="/api/auth/github/login"
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-neutral-900 px-4 text-[14px] font-medium text-white transition-colors hover:bg-neutral-800"
      >
        <GithubLogo size={16} weight="fill" />
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
    <div className="space-y-5">
      <ol className="space-y-3">
        <Step n={1}>
          Click <span className="font-semibold">Generate install snippet</span>{" "}
          below — we mint an API key tied to your GitHub account.
        </Step>
        <Step n={2}>
          Copy the two-line snippet and paste it into any terminal that has
          Claude Code installed.
        </Step>
        <Step n={3}>
          From that terminal you can ask Claude things like{" "}
          <em className="text-neutral-700">
            &ldquo;map vercel/swr for me&rdquo;
          </em>{" "}
          or{" "}
          <em className="text-neutral-700">
            &ldquo;trace what depends on src/lib/auth.ts&rdquo;
          </em>{" "}
          — the graph appears here.
        </Step>
      </ol>
      <button
        type="button"
        onClick={onMint}
        disabled={minting}
        className={cn(
          "inline-flex h-12 items-center gap-2 rounded-lg bg-accent-magenta px-5 text-[15px] font-medium text-white transition-all",
          "hover:bg-accent-magenta/90 hover:shadow-[0_0_0_4px_rgba(232,56,164,0.15)]",
          minting && "opacity-50",
        )}
      >
        <Plus size={15} weight="bold" />
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
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <Check size={18} weight="bold" className="shrink-0 text-emerald-700" />
        <span className="text-[15px] text-emerald-900">
          You have <span className="font-semibold">{count}</span> active API
          key{count === 1 ? "" : "s"}. Claude Code is wired up.
        </span>
      </div>
      <p className="text-[14px] leading-relaxed text-neutral-600">
        Lost the install snippet?{" "}
        <button
          type="button"
          onClick={onRotate}
          disabled={minting}
          className="font-semibold text-accent-magenta underline-offset-2 hover:underline disabled:opacity-50"
        >
          {minting ? "Rotating…" : "Generate a fresh one"}
        </button>
        . Existing keys keep working.
      </p>
      <Link
        href="/app/settings"
        className="inline-flex h-9 items-center gap-1.5 text-[14px] text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        Manage keys in settings →
      </Link>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-px inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 font-mono text-[13px] font-medium text-neutral-700">
        {n}
      </span>
      <span className="pt-0.5 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </span>
    </li>
  );
}
