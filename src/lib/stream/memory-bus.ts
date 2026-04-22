// In-process event bus keyed by session id. Good enough for local dev
// and single-instance deployments. For horizontal scaling on Vercel,
// swap this module with an Upstash Redis Pub/Sub implementation — the
// `subscribe` and `publish` contracts stay the same.

type Listener = (event: StreamEvent) => void;

export interface StreamEvent {
  event: string;
  ts: number;
  // Arbitrary event payload — Claude Code hook shape for tool events
  // (tool_name, tool_input, ...) or custom shapes from other clients.
  [key: string]: unknown;
}

const channels = new Map<string, Set<Listener>>();

export function publish(sessionId: string, event: StreamEvent): void {
  const listeners = channels.get(sessionId);
  if (!listeners) return;
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      // ignore listener errors — never block publishers
    }
  }
}

export function subscribe(sessionId: string, fn: Listener): () => void {
  let set = channels.get(sessionId);
  if (!set) {
    set = new Set();
    channels.set(sessionId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) channels.delete(sessionId);
  };
}

export function sessionCount(): number {
  return channels.size;
}
