"use client";

// Causalist API keys panel — sits in /app/settings.
// Sign in with GitHub → mint a key → paste it into Claude Code (or any
// agent / CI). The key is shown ONCE in plaintext; after that we only
// keep its prefix for display. Keys are scoped to your GitHub user id.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Key, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_KEYS_CHANGED_EVENT } from "@/hooks/use-api-key-status";
import { FreshKeyReveal } from "@/components/agents/fresh-key-reveal";

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(API_KEYS_CHANGED_EVENT));
  }
}

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
      notifyChanged();
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
      notifyChanged();
    } catch (e) {
      toast.error("Couldn't revoke", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-7">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Key size={16} className="text-accent-magenta" weight="fill" />
            <h2 className="font-display text-lg font-medium tracking-tight text-neutral-900">
              API keys
            </h2>
          </div>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-600">
            Each key is a long random token (<code className="font-mono text-[13px]">cspl_live_…</code>)
            that lets an agent — Claude Code, a CI job, anything that can make
            an HTTP request — act on your account. Tied to your GitHub
            identity, scoped to your account only. Revoke any time.
          </p>
        </div>
      </header>

      {!authenticated ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-[15px] text-amber-900">
          Sign in with GitHub to mint API keys.
        </div>
      ) : (
        <>
          {/* Fresh-key reveal — shared component used by both this
              panel and the ConnectClaudeCard so the user always sees
              the same install snippet + example prompts after minting. */}
          {revealedToken && (
            <div className="mb-6">
              <FreshKeyReveal
                token={revealedToken}
                onDismiss={() => setRevealedToken(null)}
              />
            </div>
          )}

          {/* Mint row */}
          <div className="mb-6 flex items-center gap-2">
            <Input
              placeholder="Name (e.g. claude-code, github-action)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 flex-1 text-[14px]"
              maxLength={80}
            />
            <Button
              onClick={onMint}
              disabled={minting}
              className="h-11 bg-accent-magenta px-4 text-[14px] text-white hover:bg-accent-magenta/90 disabled:opacity-50"
            >
              <Plus size={14} weight="bold" className="mr-1.5" />
              {minting ? "Creating…" : "Create key"}
            </Button>
          </div>

          {/* Existing keys */}
          {loading && keys === null ? (
            <div className="text-[14px] text-neutral-400">Loading…</div>
          ) : keys && keys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-6 text-center text-[15px] text-neutral-500">
              No keys yet. Create one above to wire an agent to your account.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {keys?.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[14.5px]">
                      <span className="font-semibold text-neutral-900">
                        {k.name}
                      </span>
                      <code className="font-mono text-[12.5px] text-neutral-500">
                        {k.keyPrefix}…
                      </code>
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-neutral-400">
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
            Use as{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12.5px]">
              Authorization: Bearer cspl_live_…
            </code>{" "}
            on{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12.5px]">
              POST /api/projects
            </code>
            .
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
