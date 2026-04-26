"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Eye,
  EyeSlash,
  GithubLogo,
  Key,
  Shield,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGithubAuth } from "@/hooks/use-github-auth";
import {
  clearSettings,
  saveSettings,
  useSettings,
} from "@/lib/settings";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";

export default function SettingsPage() {
  const settings = useSettings();
  const auth = useGithubAuth();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [saved, setSaved] = useState(false);
  const githubConnected = auth.authenticated || Boolean(settings.githubToken);

  useEffect(() => {
    setAnthropicKey(settings.anthropicKey);
    setGithubToken(settings.githubToken);
  }, [settings.anthropicKey, settings.githubToken]);

  const hasChanges =
    anthropicKey !== settings.anthropicKey ||
    githubToken !== settings.githubToken;

  const onSave = () => {
    saveSettings({ anthropicKey, githubToken });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const onClear = () => {
    if (!confirm("Clear both keys from this browser?")) return;
    clearSettings();
    setAnthropicKey("");
    setGithubToken("");
  };

  return (
    <PageShell width="form">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (hasChanges) onSave();
        }}
      >
      <PageHeader
        eyebrow="Settings"
        title="Keys"
        description={
          <>
            Causalist runs in your browser. Your API keys are stored only in
            this device&rsquo;s <code className="font-mono text-[12px]">localStorage</code>,
            sent directly to Anthropic and GitHub, and never touch our servers.
          </>
        }
      />
      <div>
        {/* Anthropic — gated on GitHub connection so the demo path is
            ordered: connect identity first, then add agent compute. */}
        <section className="mb-10 rounded-2xl border border-neutral-200 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-900">
                <Logo size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-medium">
                  Your Anthropic API key
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Powers the four-agent pipeline (Structure / Dependency /
                  Semantic / Oracle) and per-node review agents. Calls go
                  directly from your browser to api.anthropic.com — your key
                  never leaves this device.
                </p>
              </div>
            </div>
            {settings.anthropicKey && githubConnected && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                <CheckCircle size={14} weight="fill" />
                Set
              </span>
            )}
          </div>

          {!githubConnected ? (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 p-5 text-center">
              <p className="text-sm text-neutral-600">
                Connect GitHub first.
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[12px] text-neutral-500">
                Causalist needs to know who you are before it stores a key for
                you — it&rsquo;s also what makes &ldquo;Open PR&rdquo; in the
                Agents tab work.
              </p>
              <Link
                href="/api/auth/github/login"
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-[13px] text-white transition-colors hover:bg-neutral-800"
              >
                <GithubLogo size={14} weight="fill" />
                Connect GitHub
              </Link>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAnthropic ? "text" : "password"}
                    placeholder="sk-ant-api03-…"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnthropic((v) => !v)}
                    aria-label={showAnthropic ? "Hide key" : "Show key"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
                  >
                    {showAnthropic ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-400">
                Get one at{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-neutral-700"
                >
                  console.anthropic.com/settings/keys
                </a>
                .
              </p>
            </>
          )}
        </section>

        {/* GitHub */}
        <section className="mb-10 rounded-2xl border border-neutral-200 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200">
                <GithubLogo size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="font-display text-lg font-medium">
                  GitHub token
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Required to analyze <em>private</em> repos. Public repos work
                  without one.
                </p>
              </div>
            </div>
            {settings.githubToken && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                <CheckCircle size={14} weight="fill" />
                Set
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showGithub ? "text" : "password"}
                placeholder="github_pat_…"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="h-11 pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowGithub((v) => !v)}
                aria-label={showGithub ? "Hide token" : "Show token"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700"
              >
                {showGithub ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Create a fine-grained token with <code className="font-mono">repo</code>{" "}
            read access at{" "}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-neutral-700"
            >
              github.com/settings/personal-access-tokens
            </a>
            .
          </p>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClear}
            disabled={!settings.anthropicKey && !settings.githubToken}
            className="flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-neutral-400"
          >
            <Trash size={13} />
            Clear both
          </button>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle size={14} weight="fill" />
                Saved
              </span>
            )}
            <Button
              onClick={onSave}
              disabled={!hasChanges}
              className="h-10 bg-neutral-900 px-5 text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              <Key size={14} className="mr-1.5" />
              Save keys
            </Button>
          </div>
        </div>

        {/* API keys — mint, list, revoke. Tied to GitHub identity. */}
        <ApiKeysPanel authenticated={auth.authenticated} />

        {/* Privacy footer */}
        <div className="mt-8 flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-4 text-xs text-neutral-500">
          <Shield size={14} weight="duotone" className="mt-0.5 shrink-0" />
          <p>
            Keys live in browser storage only. Analyze requests call
            api.anthropic.com and api.github.com directly from your browser.
            Nothing is stored server-side.
          </p>
        </div>
      </div>
      </form>
    </PageShell>
  );
}
