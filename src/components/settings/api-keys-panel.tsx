"use client";

// Causalist API keys panel — sits in /app/settings.
// Sign in with GitHub → mint a key → paste it into Claude Code (or any
// agent / CI). The key is shown ONCE in plaintext; after that we only
// keep its prefix for display. Keys are scoped to your GitHub user id.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Key,
  Plus,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface KeyRecord {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number;
}

export function ApiKeysPanel({ authenticated }: { authenticated: boolean }) {
  const [keys, setKeys] = useState<KeyRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [minting, setMinting] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const res = await fetch("/api/keys", { credentials: "same-origin" });
      const data = (await res.json()) as { keys?: KeyRecord[] };
      setKeys(data.keys ?? []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onMint = async () => {
    if (!authenticated) {
      toast.error("Sign in with GitHub first");
      return;
    }
    setMinting(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "untitled" }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error ?? `mint failed (${res.status})`);
      }
      const { token } = (await res.json()) as { token: string };
      setRevealedToken(token);
      setName("");
      void refresh();
    } catch (e) {
      toast.error("Couldn't create key", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setMinting(false);
    }
  };

  const onRevoke = async (id: string, prefix: string) => {
    if (!confirm(`Revoke key ${prefix}…?  Any agent using it will break.`)) return;
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`revoke failed (${res.status})`);
      toast.success("Key revoked");
      void refresh();
    } catch (e) {
      toast.error("Couldn't revoke", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onCopy = async () => {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select and ⌘C");
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-neutral-200 bg-white p-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Key size={14} className="text-accent-magenta" weight="fill" />
            <h2 className="font-display text-base font-medium tracking-tight text-neutral-900">
              API keys
            </h2>
          </div>
          <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-neutral-500">
            Use these to let an agent — Claude Code via MCP, a CI job, anything
            — create projects on your account without the pair-code dance.
            Tied to your GitHub identity, scoped to your account only.
          </p>
        </div>
      </header>

      {!authenticated ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-[12.5px] text-amber-800">
          Sign in with GitHub to mint API keys.
        </div>
      ) : (
        <>
          {/* One-time reveal panel — shown after a successful mint */}
          {revealedToken && (
            <div className="mb-4 rounded-lg border border-accent-magenta/30 bg-accent-magenta/[0.04] p-4">
              <div className="flex items-start gap-2 text-[12.5px] text-neutral-900">
                <Warning
                  size={14}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-accent-magenta"
                />
                <div>
                  <div className="font-medium">
                    Copy this key now — it won&rsquo;t be shown again.
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-neutral-500">
                    We store only its hash. If you lose it, mint a new one.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-neutral-200 bg-white p-2">
                <code className="flex-1 select-all overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px] text-neutral-900">
                  {revealedToken}
                </code>
                <button
                  type="button"
                  onClick={onCopy}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors",
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-900 text-white hover:bg-neutral-800",
                  )}
                >
                  {copied ? <Check size={11} weight="bold" /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setRevealedToken(null)}
                className="mt-2 text-[11px] text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
              >
                I&rsquo;ve saved it — dismiss
              </button>
            </div>
          )}

          {/* Mint row */}
          <div className="mb-5 flex items-center gap-2">
            <Input
              placeholder="Name (e.g. claude-code, github-action)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 flex-1 text-[12.5px]"
              maxLength={80}
            />
            <Button
              onClick={onMint}
              disabled={minting}
              className="h-9 bg-accent-magenta px-3 text-white hover:bg-accent-magenta/90 disabled:opacity-50"
            >
              <Plus size={12} weight="bold" className="mr-1" />
              {minting ? "Creating…" : "Create key"}
            </Button>
          </div>

          {/* Existing keys */}
          {loading && keys === null ? (
            <div className="text-[12px] text-neutral-400">Loading…</div>
          ) : keys && keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-5 text-center text-[12.5px] text-neutral-500">
              No keys yet. Create one above to wire an agent to your account.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {keys?.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[12.5px]">
                      <span className="font-medium text-neutral-900">
                        {k.name}
                      </span>
                      <code className="font-mono text-[11px] text-neutral-500">
                        {k.keyPrefix}…
                      </code>
                    </div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-neutral-400">
                      Created {fmtDate(k.createdAt)}
                      {k.lastUsedAt
                        ? ` · last used ${fmtDate(k.lastUsedAt)}`
                        : " · never used"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevoke(k.id, k.keyPrefix)}
                    aria-label="Revoke"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] text-neutral-400">
            Use as <code className="font-mono">Authorization: Bearer
            cspl_live_…</code> on{" "}
            <code className="font-mono">POST /api/projects</code>.
          </p>
        </>
      )}
    </section>
  );
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}
