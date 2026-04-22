"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeSlash,
  GithubLogo,
  Key,
  Shield,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearSettings,
  saveSettings,
  useSettings,
} from "@/lib/settings";

export default function SettingsPage() {
  const settings = useSettings();
  const [anthropicKey, setAnthropicKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [saved, setSaved] = useState(false);

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
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <span className="text-sm font-semibold tracking-tight">settings</span>
        <div className="w-16" />
      </nav>

      <div className="mx-auto max-w-2xl px-8 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
            Keys
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500">
            Causalist runs in your browser. Your API keys are stored only in
            this device&rsquo;s <code className="font-mono text-[12px]">localStorage</code>
            , sent directly to Anthropic and GitHub, and never touch our
            servers.
          </p>
        </div>

        {/* Anthropic */}
        <section className="mb-10 rounded-2xl border border-neutral-200 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200">
                <Sparkle size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="font-display text-lg font-medium">
                  Anthropic API key
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Used for Structure / Dependency / Semantic / Oracle agents.
                  Claude Opus 4.7.
                </p>
              </div>
            </div>
            {settings.anthropicKey && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-600">
                <CheckCircle size={14} weight="fill" />
                Set
              </span>
            )}
          </div>
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

        {/* Privacy footer */}
        <div className="mt-12 flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-4 text-xs text-neutral-500">
          <Shield size={14} weight="duotone" className="mt-0.5 shrink-0" />
          <p>
            Keys live in browser storage only. Analyze requests call
            api.anthropic.com and api.github.com directly from your browser.
            Nothing is stored server-side.
          </p>
        </div>
      </div>
    </main>
  );
}
