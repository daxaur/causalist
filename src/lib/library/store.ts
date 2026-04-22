"use client";

import { del, get, keys, set } from "idb-keyval";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import type { CausalGraph } from "@/lib/graph/types";
import type { LibraryEntry, LibraryIndexEntry } from "./types";

const INDEX_KEY = "causalist:library:index:v1";
const ENTRY_PREFIX = "causalist:library:entry:";
const CHANGED_EVENT = "causalist:library-changed";

type Index = LibraryIndexEntry[];

async function readIndex(): Promise<Index> {
  try {
    return (await get<Index>(INDEX_KEY)) ?? [];
  } catch {
    return [];
  }
}

async function writeIndex(idx: Index): Promise<void> {
  await set(INDEX_KEY, idx);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
}

function entryKey(id: string): string {
  return `${ENTRY_PREFIX}${id}`;
}

function toIndexEntry(e: LibraryEntry): LibraryIndexEntry {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { graph, explainer, notes, ...rest } = e;
  return rest;
}

export async function listIndex(): Promise<Index> {
  return readIndex();
}

export async function getEntry(id: string): Promise<LibraryEntry | null> {
  try {
    return (await get<LibraryEntry>(entryKey(id))) ?? null;
  } catch {
    return null;
  }
}

export async function saveEntry(
  params: {
    owner: string;
    repo: string;
    graph: CausalGraph;
    sourceCommitSha?: string;
  },
): Promise<LibraryEntry> {
  const now = Date.now();
  const idx = await readIndex();
  // Dedupe: if owner/repo already exists, overwrite graph but keep
  // user-curated fields (pinned, tags, nickname, notes, shareId)
  const existingIdx = idx.find(
    (e) => e.owner === params.owner && e.repo === params.repo,
  );
  const existingFull = existingIdx ? await getEntry(existingIdx.id) : null;
  const id = existingIdx?.id ?? nanoid(10);
  const entry: LibraryEntry = {
    id,
    owner: params.owner,
    repo: params.repo,
    nickname: existingIdx?.nickname,
    graph: params.graph,
    sourceCommitSha: params.sourceCommitSha ?? params.graph.commit,
    generatedAt: existingIdx?.generatedAt ?? now,
    lastOpenedAt: now,
    pinned: existingIdx?.pinned ?? false,
    tags: existingIdx?.tags ?? [],
    notes: existingFull?.notes,
    nodeCount: params.graph.nodes.length,
    edgeCount: params.graph.edges.length,
    shareId: existingIdx?.shareId,
  };
  await set(entryKey(id), entry);
  const nextIndex = existingIdx
    ? idx.map((e) => (e.id === id ? toIndexEntry(entry) : e))
    : [toIndexEntry(entry), ...idx];
  await writeIndex(nextIndex);
  return entry;
}

export async function touch(id: string): Promise<void> {
  const idx = await readIndex();
  const now = Date.now();
  const next = idx.map((e) =>
    e.id === id ? { ...e, lastOpenedAt: now } : e,
  );
  await writeIndex(next);
  const entry = await getEntry(id);
  if (entry) await set(entryKey(id), { ...entry, lastOpenedAt: now });
}

export async function togglePin(id: string): Promise<void> {
  const idx = await readIndex();
  const next = idx.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e));
  await writeIndex(next);
  const entry = await getEntry(id);
  if (entry) await set(entryKey(id), { ...entry, pinned: !entry.pinned });
}

export async function rename(id: string, nickname: string): Promise<void> {
  const trimmed = nickname.trim();
  const idx = await readIndex();
  const next = idx.map((e) =>
    e.id === id ? { ...e, nickname: trimmed || undefined } : e,
  );
  await writeIndex(next);
  const entry = await getEntry(id);
  if (entry) {
    await set(entryKey(id), { ...entry, nickname: trimmed || undefined });
  }
}

export async function remove(id: string): Promise<void> {
  const idx = await readIndex();
  const next = idx.filter((e) => e.id !== id);
  await writeIndex(next);
  await del(entryKey(id));
}

export async function setExplainer(
  id: string,
  text: string,
): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;
  await set(entryKey(id), {
    ...entry,
    explainer: { generatedAt: Date.now(), text },
  });
}

/** Export a single entry to a downloadable JSON file. */
export function exportEntryToFile(entry: LibraryEntry): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(entry, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entry.owner}-${entry.repo}.causalist.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** React hook — subscribe to the lightweight index. */
export function useLibrary(): {
  entries: LibraryIndexEntry[];
  loading: boolean;
  reload: () => void;
} {
  const [entries, setEntries] = useState<LibraryIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    let cancelled = false;
    setLoading(true);
    readIndex().then((idx) => {
      if (cancelled) return;
      setEntries(idx);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = reload();
    const onChange = () => reload();
    if (typeof window !== "undefined") {
      window.addEventListener(CHANGED_EVENT, onChange);
      window.addEventListener("storage", onChange);
    }
    return () => {
      cleanup?.();
      if (typeof window !== "undefined") {
        window.removeEventListener(CHANGED_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { entries, loading, reload };
}

/** Debug helper — lets us verify storage quota during development. */
export async function _debugDump(): Promise<{ index: Index; keyCount: number }> {
  const ks = await keys();
  return { index: await readIndex(), keyCount: ks.length };
}
