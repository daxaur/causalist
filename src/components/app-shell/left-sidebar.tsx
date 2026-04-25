"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  BookOpen,
  FolderOpen,
  GearSix,
  GithubLogo,
  Plugs,
  Plus,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarBody,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { GitHubStarButton } from "@/components/landing/github-star-button";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

// Universal sidebar: same shape on /, /app/*, /docs/*. Brand at top
// acts as Home. Workspace lives up top (the user's day-to-day);
// Resources (docs, integrations, settings) sit at the bottom so they
// stay out of the way until you reach for them.
const WORKSPACE: Item[] = [
  {
    label: "Projects",
    href: "/app",
    icon: <FolderOpen className="h-[18px] w-[18px] shrink-0" weight="duotone" />,
    match: (p) =>
      p === "/app" ||
      /^\/app\/[^/]+\/[^/]+/.test(p) ||
      p.startsWith("/app/preview"),
  },
  {
    label: "New project",
    href: "/app?new=1",
    icon: <Plus className="h-[18px] w-[18px] shrink-0" weight="bold" />,
    match: () => false,
  },
];

const RESOURCES: Item[] = [
  {
    label: "Documentation",
    href: "/docs/foundations",
    icon: <BookOpen className="h-[18px] w-[18px] shrink-0" weight="duotone" />,
    match: (p) => p.startsWith("/docs") || p.startsWith("/app/reference"),
  },
  {
    label: "Connect Claude Code",
    href: "/app/claude-code",
    icon: (
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <Plugs className="h-[16px] w-[16px]" weight="duotone" />
      </span>
    ),
    match: (p) => p.startsWith("/app/claude-code") || p === "/pair",
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: <GearSix className="h-[18px] w-[18px] shrink-0" weight="duotone" />,
    match: (p) => p === "/app/settings",
  },
];

export function LeftSidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#FAFAF8] md:flex-row">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 border-r border-neutral-200 !bg-white">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <BrandHeader open={open} />
            <StarRow open={open} />

            <SidebarSection label="Workspace" open={open}>
              {WORKSPACE.map((item) => (
                <SidebarNavLink key={item.href} item={item} />
              ))}
            </SidebarSection>
          </div>

          <div className="flex flex-col gap-3">
            <SidebarSection label="Resources" open={open} compact>
              {RESOURCES.map((item) => (
                <SidebarNavLink key={item.href} item={item} />
              ))}
            </SidebarSection>
            <Footer open={open} />
          </div>
        </SidebarBody>
      </Sidebar>

      <main className="relative flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

function BrandHeader({ open }: { open: boolean }) {
  return (
    <Link
      href="/"
      className="relative z-20 flex items-center gap-2.5 py-1 text-sm"
    >
      <Logo size={22} />
      <motion.span
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0,
        }}
        className="font-display text-[15px] font-medium tracking-tight text-neutral-900"
      >
        causalist
      </motion.span>
    </Link>
  );
}

function StarRow({ open }: { open: boolean }) {
  // Only render the full star button when sidebar is expanded — when
  // collapsed, the brand row alone is enough chrome at the top.
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-3"
    >
      <GitHubStarButton variant="sidebar" />
    </motion.div>
  );
}

function SidebarSection({
  label,
  open,
  children,
  compact = false,
}: {
  label: string;
  open: boolean;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "mt-0" : "mt-8")}>
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          height: open ? "auto" : 0,
        }}
        className="mb-1 overflow-hidden px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400"
      >
        {label}
      </motion.span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function SidebarNavLink({ item }: { item: Item }) {
  const pathname = usePathname();
  const { open, animate } = useSidebar();
  const active = item.match?.(pathname) ?? pathname === item.href;
  return (
    <Link
      href={item.href}
      className={cn(
        "group/sidebar flex items-center gap-3 overflow-hidden rounded-md px-1.5 py-2 transition-colors",
        active
          ? "bg-accent-magenta/8 text-accent-magenta"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
      )}
    >
      <span
        className={cn(
          "transition-colors",
          active
            ? "text-accent-magenta"
            : "text-neutral-500 group-hover/sidebar:text-neutral-900",
        )}
      >
        {item.icon}
      </span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="whitespace-pre text-[13px] font-medium transition-transform duration-150 group-hover/sidebar:translate-x-0.5"
      >
        {item.label}
      </motion.span>
    </Link>
  );
}

function Footer({ open }: { open: boolean }) {
  const auth = useGithubAuth();
  const connected = auth.authenticated;

  if (connected && auth.avatar_url) {
    return (
      <Link
        href="/app/profile"
        className="flex items-center gap-3 overflow-hidden rounded-md px-1.5 py-2 transition-colors hover:bg-neutral-100"
      >
        <span
          className="relative block h-[20px] w-[20px] shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-1 ring-neutral-200"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={auth.avatar_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </span>
        <motion.div
          animate={{
            opacity: open ? 1 : 0,
            width: open ? "auto" : 0,
          }}
          className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        >
          <div className="truncate text-[13px] font-medium text-neutral-900">
            {auth.login}
          </div>
          <div className="truncate font-mono text-[10px] text-neutral-400">
            github
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link
      href="/api/auth/github/login"
      className="flex items-center gap-3 overflow-hidden rounded-md px-1.5 py-2 transition-colors hover:bg-neutral-100"
    >
      <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center">
        <GithubLogo className="h-[18px] w-[18px] text-neutral-700" weight="fill" />
      </div>
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          width: open ? "auto" : 0,
        }}
        className="overflow-hidden whitespace-nowrap text-[13px] font-medium text-neutral-700"
      >
        Connect GitHub
      </motion.span>
    </Link>
  );
}
