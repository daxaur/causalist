"use client";

// OracleAsk — minimal composer that streams a Q&A from the Causalist
// Oracle Managed Agent (/api/agent/managed-query). Renders the live
// text reply, plus a quiet rolling list of the graph tools the agent
// is calling so users SEE the multi-turn tool-use loop happening.

import { useRef, useState } from "react";
import { ArrowUp, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import type { CausalGraph } from "@/lib/graph/types";
import { cn } from "@/lib/utils";

interface ToolCall {
  name: string;
  ok?: boolean;
  summary?: string;
}

interface Props {
  graph: CausalGraph;
  /** Optional context — e.g. "Selected nodes: a, b, c". */
  context?: string;
  className?: string;
}

export function OracleAsk({ graph, context, className }: Props) {
  const settings = useSettings();
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [reply, setReply] = useState("");
  const [calls, setCalls] = useState<ToolCall[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSend =
    Boolean(settings.anthropicKey) && question.trim().length > 0 && !streaming;

  const ask = async () => {
    if (!canSend) return;
    setReply("");
    setCalls([]);
    setSessionId(null);
    setErr(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/managed-query", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.anthropicKey}`,
        },
        body: JSON.stringify({ question, graph, context }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = chunk.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          let parsed: { [k: string]: unknown };
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          switch (event) {
            case "session_started":
              setSessionId((parsed.sessionId as string) ?? null);
              break;
            case "text":
              setReply((r) => r + ((parsed.delta as string) ?? ""));
              break;
            case "tool_use":
              setCalls((c) => [
                ...c,
                { name: (parsed.name as string) ?? "?" },
              ]);
              break;
            case "tool_result":
              setCalls((c) => {
                const next = [...c];
                for (let i = next.length - 1; i >= 0; i--) {
                  if (next[i].name === parsed.name && next[i].ok == null) {
                    next[i] = {
                      ...next[i],
                      ok: parsed.ok as boolean,
                      summary: parsed.summary as string | undefined,
                    };
                    break;
                  }
                }
                return next;
              });
              break;
            case "error":
              setErr((parsed.message as string) ?? "Managed run failed");
              break;
            case "done":
              // Final state — text already streamed via `text` events.
              break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2">
        <Logo size={13} className="text-accent-magenta" />
        <span className="font-display text-[13px] font-medium text-neutral-900">
          Causalist Oracle
        </span>
        <span className="rounded-sm border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
          Managed Agent
        </span>
        {sessionId && (
          <span
            className="ml-auto truncate font-mono text-[9px] text-neutral-300"
            title={sessionId}
          >
            session {sessionId.slice(0, 10)}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void ask();
            }
          }}
          rows={2}
          placeholder="What breaks if I delete the auth middleware?"
          disabled={streaming}
          className="w-full resize-none rounded-t-lg bg-transparent px-3 py-2.5 text-[13px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between border-t border-neutral-100 px-2 py-1.5">
          <span className="font-mono text-[10px] text-neutral-400">
            {streaming
              ? "Oracle is thinking…"
              : "⌘↵ to send · routed through client.beta.sessions"}
          </span>
          <Button
            type="button"
            onClick={ask}
            disabled={!canSend}
            className={cn(
              "h-8 w-8 rounded-md p-0",
              canSend
                ? "bg-accent-magenta hover:bg-accent-magenta/90"
                : "bg-neutral-100 text-neutral-300",
            )}
            aria-label="Ask Oracle"
          >
            <ArrowUp size={13} weight="bold" />
          </Button>
        </div>
      </div>

      {/* Tool-call timeline — visible proof of multi-turn tool use. */}
      {calls.length > 0 && (
        <div className="space-y-1 rounded-md border border-neutral-200 bg-neutral-50/60 px-2.5 py-2">
          <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
            Tool calls · {calls.length}
          </div>
          {calls.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 font-mono text-[11px]"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  c.ok == null
                    ? "animate-pulse bg-amber-400"
                    : c.ok
                      ? "bg-emerald-500"
                      : "bg-red-500",
                )}
              />
              <span className="truncate text-neutral-700">{c.name}</span>
              {c.summary && (
                <span className="truncate text-neutral-400">{c.summary}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Streaming reply */}
      {(reply || streaming) && (
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkle size={10} weight="duotone" className="text-accent-magenta" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
              Reply
            </span>
          </div>
          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-800">
            {reply}
            {streaming && (
              <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-accent-magenta align-middle" />
            )}
          </div>
        </div>
      )}

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {err}
        </div>
      )}

      {!settings.anthropicKey && (
        <p className="text-[11px] text-neutral-400">
          Add your Anthropic key in settings to ask the Oracle.
        </p>
      )}
    </div>
  );
}
