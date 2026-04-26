"use client";

// Lightweight "do you have any active API key?" probe. Re-fetches on
// the same custom event the ApiKeysPanel + ConnectClaudeCard fire when
// they mint or revoke a key, so the sidebar dot lights up immediately
// after the user wires Claude Code.

import { useCallback, useEffect, useState } from "react";

export const API_KEYS_CHANGED_EVENT = "causalist:api-keys:changed";

export function useApiKeyStatus(): { hasKey: boolean; loading: boolean } {
  const [state, setState] = useState<{ hasKey: boolean; loading: boolean }>({
    hasKey: false,
    loading: true,
  });

  const refresh = useCallback(() => {
    fetch("/api/keys", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { keys: [] }))
      .then((d: { keys?: unknown[] }) =>
        setState({ hasKey: (d.keys?.length ?? 0) > 0, loading: false }),
      )
      .catch(() => setState({ hasKey: false, loading: false }));
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    if (typeof window !== "undefined") {
      window.addEventListener(API_KEYS_CHANGED_EVENT, onChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(API_KEYS_CHANGED_EVENT, onChange);
      }
    };
  }, [refresh]);

  return state;
}
