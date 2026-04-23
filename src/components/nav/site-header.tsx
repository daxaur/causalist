"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  GearSix,
  GithubLogo,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { GitHubStarButton } from "@/components/landing/github-star-button";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Page-specific actions injected into the shared header's right slot.
 * A page calls `useHeaderActions(<node>)` to push actions; the SiteHeader
 * renders whatever is current. Falls back to the default Connect/Settings
 * row when no page contributes actions.
 */
const HeaderActionsContext = createContext<{
  actions: ReactNode | null;
  setActions: (node: ReactNode | null) => void;
}>({ actions: null, setActions: () => {} });

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode | null>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

/**
 * Client pages can push a node into the right slot of the shared header.
 * Wrap in useEffect inside the page to mount/unmount cleanly.
 */
export function useHeaderActionsSetter() {
  return useContext(HeaderActionsContext).setActions;
}

/**
 * Shared site header. Centered nav with consistent links so every
 * route in the app reads as one product. Hides itself on `/` where
 * the landing page draws its own richer header.
 */
export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return <SiteHeaderVisible pathname={pathname} />;
}

function SiteHeaderVisible({ pathname }: { pathname: string }) {
  const { actions } = useContext(HeaderActionsContext);
  const settings = useSettings();
  const auth = useGithubAuth();
  const isConnected = auth.authenticated || Boolean(settings.githubToken);

  return (
    <header className="sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-neutral-100 bg-white/90 px-6 py-3 backdrop-blur">
      <div className="justify-self-start">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={18} />
          <span className="font-display text-sm font-medium tracking-tight">
            causalist
          </span>
        </Link>
      </div>

      <nav className="flex items-center gap-1 justify-self-center">
        <NavLink href="/dashboard" label="Repos" active={pathname.startsWith("/dashboard")} />
        <NavLink href="/library" label="Library" active={pathname.startsWith("/library")} />
        <NavLink href="/reference" label="Reference" active={pathname.startsWith("/reference")} />
        <NavLink href="/agents" label="Agents" active={pathname.startsWith("/agents")} />
        <NavLink
          href="/docs/foundations"
          label="Docs"
          active={pathname.startsWith("/docs")}
        />
      </nav>

      <div className="flex items-center gap-2 justify-self-end">
        {actions && (
          <div className="mr-1 flex items-center gap-2 border-r border-neutral-100 pr-3">
            {actions}
          </div>
        )}
        <div className="hidden sm:block">
          <GitHubStarButton />
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
        >
          <GearSix size={13} />
          {!settings.anthropicKey && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
            />
          )}
        </Link>
        {isConnected ? (
          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white transition-colors hover:bg-neutral-800 sm:inline-flex"
            style={{ height: 32 }}
          >
            {auth.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={auth.avatar_url}
                alt=""
                width={14}
                height={14}
                className="rounded-full"
              />
            ) : (
              <GithubLogo size={13} weight="fill" />
            )}
            {auth.login ?? "Your repos"}
            <ArrowRight size={11} />
          </Link>
        ) : (
          <Link
            href="/api/auth/github/login"
            className="hidden items-center gap-2 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white transition-colors hover:bg-neutral-800 sm:inline-flex"
            style={{ height: 32 }}
          >
            <GithubLogo size={13} weight="fill" />
            Connect
          </Link>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
      )}
    >
      {label}
    </Link>
  );
}
