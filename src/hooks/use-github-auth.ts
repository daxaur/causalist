"use client";

import { useEffect, useState } from "react";

interface AuthState {
  authenticated: boolean;
  login?: string;
  avatar_url?: string;
  token?: string;
}

export function useGithubAuth() {
  const [state, setState] = useState<AuthState>({ authenticated: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d: AuthState) => {
        if (!cancelled) setState(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setState({ authenticated: false });
  };

  return { ...state, loading, logout };
}
