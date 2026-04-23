"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  DotsThree,
  DownloadSimple,
  MagnifyingGlass,
  PushPin,
  PushPinSlash,
  Star,
  Trash,
  Upload,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import {
  exportEntryToFile,
  getEntry,
  remove,
  togglePin,
  useLibrary,
} from "@/lib/library/store";
import type { LibraryIndexEntry } from "@/lib/library/types";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
  const { entries, loading } = useLibrary();
  const [query, setQuery] = useState("");

  const { pinned, rest } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? entries.filter(
          (e) =>
            `${e.owner}/${e.repo}`.toLowerCase().includes(q) ||
            (e.nickname ?? "").toLowerCase().includes(q),
        )
      : entries;
    return {
      pinned: filtered.filter((e) => e.pinned),
      rest: filtered
        .filter((e) => !e.pinned)
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt),
    };
  }, [entries, query]);

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
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={18} />
          <span className="font-display text-sm font-medium tracking-tight">
            library
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
          >
            All repos
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-8 pt-12 pb-24">
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
              Your library
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {entries.length} saved {entries.length === 1 ? "graph" : "graphs"}
              {pinned.length > 0 && ` · ${pinned.length} pinned`}
            </p>
          </div>
          <ImportButton />
        </header>

        <div className="relative mb-6">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <Input
            placeholder="Search your library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9"
          />
        </div>

        {loading && (
          <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-400">
            Loading…
          </div>
        )}

        {!loading && entries.length === 0 && <EmptyState />}

        {pinned.length > 0 && (
          <Section title="Pinned" entries={pinned} />
        )}
        {rest.length > 0 && (
          <Section
            title={pinned.length > 0 ? "All" : "Recently generated"}
            entries={rest}
          />
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  entries,
}: {
  title: string;
  entries: LibraryIndexEntry[];
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => (
          <Card key={e.id} entry={e} />
        ))}
      </div>
    </section>
  );
}

function Card({ entry }: { entry: LibraryIndexEntry }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const onPin = async () => {
    await togglePin(entry.id);
    setMenuOpen(false);
  };
  const onDelete = async () => {
    if (!confirm(`Remove ${entry.owner}/${entry.repo} from your library?`))
      return;
    await remove(entry.id);
    setMenuOpen(false);
  };
  const onExport = async () => {
    const full = await getEntry(entry.id);
    if (full) exportEntryToFile(full);
    setMenuOpen(false);
  };

  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <Link href={`/${entry.owner}/${entry.repo}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-mono text-sm text-neutral-900">
            {entry.pinned && (
              <PushPin size={11} weight="fill" className="text-[#E838A4]" />
            )}
            <span className="truncate">
              {entry.nickname ?? `${entry.owner}/${entry.repo}`}
            </span>
          </div>
          {entry.nickname && (
            <div className="mt-0.5 truncate font-mono text-[11px] text-neutral-400">
              {entry.owner}/{entry.repo}
            </div>
          )}
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More actions"
            className="-m-1 rounded p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <DotsThree size={16} weight="bold" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-20 w-36 overflow-hidden rounded-md border border-neutral-200 bg-white py-1 text-xs shadow-lg"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <MenuItem
                onClick={onPin}
                icon={
                  entry.pinned ? (
                    <PushPinSlash size={12} />
                  ) : (
                    <PushPin size={12} />
                  )
                }
                label={entry.pinned ? "Unpin" : "Pin"}
              />
              <MenuItem
                onClick={onExport}
                icon={<DownloadSimple size={12} />}
                label="Export JSON"
              />
              <MenuItem
                onClick={onDelete}
                icon={<Trash size={12} />}
                label="Remove"
                destructive
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-2">
        <div className="grid grid-cols-2 gap-3 text-[11px] text-neutral-400">
          <Metric label="nodes" value={entry.nodeCount.toLocaleString()} />
          <Metric label="edges" value={entry.edgeCount.toLocaleString()} />
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[10px] text-neutral-400">
          <Clock size={10} />
          {relTime(entry.lastOpenedAt)}
        </div>
      </div>

      <Link
        href={`/${entry.owner}/${entry.repo}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`Open ${entry.owner}/${entry.repo}`}
      >
        <span className="sr-only">open</span>
      </Link>
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  label,
  destructive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm text-neutral-700">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-600">
        <Star size={18} weight="duotone" />
      </div>
      <h2 className="font-display text-xl font-medium tracking-tight">
        No saved graphs yet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        Map any repository at{" "}
        <span className="font-mono text-neutral-700">
          causalist.dev/&lt;owner&gt;/&lt;repo&gt;
        </span>{" "}
        and it saves here automatically.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
      >
        Browse your repos
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function ImportButton() {
  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.graph?.nodes || !parsed.owner || !parsed.repo) {
        alert("Not a Causalist library export.");
        return;
      }
      const { saveEntry } = await import("@/lib/library/store");
      await saveEntry({
        owner: parsed.owner,
        repo: parsed.repo,
        graph: parsed.graph,
        sourceCommitSha: parsed.sourceCommitSha,
      });
    } catch (e) {
      alert(`Import failed: ${e instanceof Error ? e.message : e}`);
    }
  };
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-700 transition-colors hover:border-neutral-300">
      <Upload size={13} />
      Import JSON
      <input
        type="file"
        accept="application/json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function relTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}
