"use client";

import { useEffect, useState } from "react";

const KEY = "causalist:pair:session";

export interface PairStatus {
  paired: boolean;
  sessionId: string | null;
  /** Forget the local pair — wipes the session id from this browser. */
  unpair: () => void;
}

/**
 * Reactive read of the Claude Code pair state. The pair-wizard writes
 * the sessionId to localStorage on success; this hook watches storage
 * events + a same-tab CustomEvent so any component (profile, sidebar
 * footer, project list) sees the same source of truth without prop
 * drilling.
 */
export function usePairStatus(): PairStatus {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSessionId(window.localStorage.getItem(KEY));

    const onChange = () =>
      setSessionId(window.localStorage.getItem(KEY));
    window.addEventListener("storage", onChange);
    window.addEventListener("causalist:pair:changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("causalist:pair:changed", onChange);
    };
  }, []);

  const unpair = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event("causalist:pair:changed"));
    setSessionId(null);
  };

  return { paired: Boolean(sessionId), sessionId, unpair };
}
