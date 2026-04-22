"use client";

import { useEffect, useRef, useState } from "react";

export interface CausalistStreamEvent {
  event: string;
  ts: number;
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown> & { file_path?: string };
  tool_response?: unknown;
  cwd?: string;
  [key: string]: unknown;
}

/**
 * Subscribe to a Causalist session stream. The browser receives every
 * tool-use event the paired Claude Code session emits — use it to
 * highlight nodes in the graph or render a live activity log.
 *
 * Pass `null` to disable. The hook buffers the last 500 events to keep
 * memory bounded in long sessions.
 */
export function useCausalistStream(sessionId: string | null) {
  const [events, setEvents] = useState<CausalistStreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource(`/api/stream/${sessionId}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener("tool", (e) => {
      try {
        const payload = JSON.parse(
          (e as MessageEvent<string>).data,
        ) as CausalistStreamEvent;
        setEvents((prev) =>
          prev.length >= 500 ? [...prev.slice(1), payload] : [...prev, payload],
        );
      } catch {
        // ignore malformed events
      }
    });

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [sessionId]);

  return { events, connected };
}
