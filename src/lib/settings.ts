"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "causalist:settings:v1";
const EVENT = "causalist:settings-changed";

export interface Settings {
  anthropicKey: string;
  githubToken: string;
}

const empty: Settings = { anthropicKey: "", githubToken: "" };

function read(): Settings {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      anthropicKey: typeof parsed.anthropicKey === "string" ? parsed.anthropicKey : "",
      githubToken: typeof parsed.githubToken === "string" ? parsed.githubToken : "",
    };
  } catch {
    return empty;
  }
}

function write(next: Settings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => empty);
}

export function saveSettings(next: Partial<Settings>): void {
  write({ ...read(), ...next });
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

// Re-export a ready flag, useful on mount-heavy pages
export function useSettingsReady(): boolean {
  const s = useSettings();
  // Consider ready if at least one key is set; call sites can narrow further.
  return Boolean(s.anthropicKey || s.githubToken);
}

// Guarded effect — run only after hydration, so SSR output stays stable
export function useOnMount(cb: () => void): void {
  useEffect(() => {
    cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
