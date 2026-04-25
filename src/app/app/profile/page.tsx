"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle,
  GithubLogo,
  Key,
  Lightning,
  Plugs,
  SignOut,
  Warning,
} from "@phosphor-icons/react";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { usePairStatus } from "@/hooks/use-pair-status";
import { useSettings } from "@/lib/settings";
import { useLibrary } from "@/lib/library/store";
import { PairWizard } from "@/components/projects/pair-wizard";

export default function ProfilePage() {
  const auth = useGithubAuth();
  const settings = useSettings();
  const { entries } = useLibrary();
  const pair = usePairStatus();
  const connected = auth.authenticated;
  const hasKey = Boolean(settings.anthropicKey);

  const onUnpair = () => {
    pair.unpair();
    toast.success("Unpaired", { description: "This browser is no longer paired with Claude Code." });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FAFAF8]">
      <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Account
          </div>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
            Profile
          </h1>
          <p className="mt-2 text-[13px] text-neutral-500">
            Who Causalist sees you as on this device.
          </p>
        </div>

        {/* Identity card */}
        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50">
              {connected && auth.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={auth.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <GithubLogo size={22} weight="duotone" className="text-neutral-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[18px] font-medium text-neutral-900">
                {connected ? auth.login : "Not signed in"}
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-500">
                {connected
                  ? "Signed in via GitHub OAuth"
                  : "Connect GitHub so agents can read repos and open PRs on your behalf."}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {connected ? (
                  <button
                    type="button"
                    onClick={() => auth.logout()}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-[12px] text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    <SignOut size={12} />
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/api/auth/github/login"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-3.5 text-[13px] text-white transition-colors hover:bg-neutral-800"
                  >
                    <GithubLogo size={13} weight="fill" />
                    Connect GitHub
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Status grid */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="GitHub"
            value={connected ? "Connected" : "Not signed in"}
            icon={
              connected ? (
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
              ) : (
                <Warning size={14} weight="fill" className="text-amber-500" />
              )
            }
            note={connected ? `as @${auth.login}` : "needed for PRs"}
          />
          <StatCard
            label="Anthropic key"
            value={hasKey ? "Set" : "Missing"}
            icon={
              hasKey ? (
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
              ) : (
                <Key size={14} className="text-neutral-400" />
              )
            }
            note={hasKey ? "stored locally" : "needed for agents"}
          />
          <StatCard
            label="Claude Code"
            value={pair.paired ? "Paired" : "Not paired"}
            icon={
              pair.paired ? (
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
              ) : (
                <Plugs size={14} className="text-neutral-400" />
              )
            }
            note={
              pair.paired
                ? `session ${pair.sessionId?.slice(0, 8)}…`
                : "no terminal paired"
            }
          />
          <StatCard
            label="Projects"
            value={`${entries.length}`}
            icon={
              <span className="font-mono text-[12px] text-accent-magenta">▸</span>
            }
            note={`${entries.length === 1 ? "graph" : "graphs"} mapped`}
          />
        </section>

        {/* Claude Code dedicated row — gives the pair state real estate
            beyond the small stat card. Live pulse when paired so it's
            visibly different from the GitHub / Anthropic rows. */}
        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
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
              <div>
                <div className="flex items-center gap-2 font-display text-[14px] font-medium text-neutral-900">
                  Claude Code
                  {pair.paired ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      paired
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-neutral-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                      idle
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-neutral-500">
                  {pair.paired ? (
                    <>
                      Session{" "}
                      <code className="font-mono text-[11px] text-neutral-700">
                        {pair.sessionId}
                      </code>{" "}
                      — Claude Code can query the graph and push projects here.
                    </>
                  ) : (
                    <>
                      No terminal is paired. Pair Claude Code to give it eleven
                      typed graph tools.
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {pair.paired ? (
                <button
                  type="button"
                  onClick={onUnpair}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 text-[12px] text-neutral-600 transition-colors hover:border-red-300 hover:text-red-600"
                >
                  <SignOut size={12} />
                  Unpair
                </button>
              ) : (
                <PairWizard>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    <Lightning size={12} weight="fill" />
                    Pair
                  </button>
                </PairWizard>
              )}
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <ProfileLink
            href="/app/settings"
            label="Manage API keys"
            sub="Anthropic key, GitHub PAT (optional)"
          />
          <ProfileLink
            href="/app"
            label="Your projects"
            sub={`${entries.length} mapped`}
          />
          <ProfileLink
            href="/app/claude-code"
            label="Connect Claude Code"
            sub="Pair your terminal — three commands"
          />
        </section>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Causalist · client-only · keys stay in your browser
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-[18px] font-medium text-neutral-900">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-neutral-500">{note}</div>
    </div>
  );
}

function ProfileLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 border-b border-neutral-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-neutral-50/60"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-neutral-900">{label}</div>
        <div className="mt-0.5 text-[11px] text-neutral-500">{sub}</div>
      </div>
      <ArrowRight
        size={13}
        className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-magenta"
      />
    </Link>
  );
}
