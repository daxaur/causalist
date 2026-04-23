"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  GearSix,
  GithubLogo,
  HouseSimple,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarBody,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

// Intentionally short — 4 items total. Saved graphs and reference
// are reachable as tabs on Home, not as their own sidebar links.
const WORKSPACE: Item[] = [
  {
    label: "Home",
    href: "/app",
    icon: <HouseSimple className="h-[18px] w-[18px] shrink-0" weight="duotone" />,
    match: (p) => p === "/app",
  },
  {
    label: "Your repos",
    href: "/app?tab=repos",
    icon: <GithubLogo className="h-[18px] w-[18px] shrink-0" weight="fill" />,
    match: (p) => /^\/app\/[^/]+\/[^/]+/.test(p),
  },
  {
    label: "Connect Claude Code",
    href: "/app?tab=claude-code",
    icon: (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src="/claude-code.png"
        alt=""
        width={18}
        height={18}
        className="h-[18px] w-[18px] shrink-0"
      />
    ),
    match: () => false,
  },
];

const ACCOUNT: Item[] = [
  {
    label: "Settings",
    href: "/settings",
    icon: <GearSix className="h-[18px] w-[18px] shrink-0" weight="duotone" />,
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

            <SidebarSection label="Workspace" open={open}>
              {WORKSPACE.map((item) => (
                <SidebarNavLink key={item.href} item={item} />
              ))}
            </SidebarSection>

            <SidebarSection label="Account" open={open}>
              {ACCOUNT.map((item) => (
                <SidebarNavLink key={item.href} item={item} />
              ))}
            </SidebarSection>
          </div>

          <Footer open={open} />
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

function SidebarSection({
  label,
  open,
  children,
}: {
  label: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col">
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
        "group/sidebar flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
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

  // Wrapping the avatar in a fixed-size shrink-0 box prevents flex
  // math from warping it into a rectangle when the sidebar width
  // animates down to 60px.
  if (connected && auth.avatar_url) {
    return (
      <Link
        href="/settings"
        className="flex items-center gap-3 overflow-hidden rounded-md px-2 py-2 transition-colors hover:bg-neutral-100"
      >
        <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={auth.avatar_url}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] rounded-full object-cover ring-1 ring-neutral-200"
          />
        </div>
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
      className="flex items-center gap-3 overflow-hidden rounded-md px-2 py-2 transition-colors hover:bg-neutral-100"
    >
      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">
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

