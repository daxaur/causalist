"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Check,
  Copy,
  DownloadSimple,
  FileText,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import { LAYER_COLORS } from "@/lib/graph/types";
import { buildFixPrompt } from "@/lib/graph/prompt";
import { cn } from "@/lib/utils";

/**
 * Modal that shows a generated prompt visibly — user can read it,
 * edit it, add a Task description, then copy or download. Replaces
 * silent clipboard-copy so users always see what they're sending.
 */
export function PromptPreviewModal({
  open,
  onClose,
  graph,
  selectedIds,
  suggestedTask,
}: {
  open: boolean;
  onClose: () => void;
  graph: CausalGraph;
  selectedIds: string[];
  suggestedTask?: string;
}) {
  const [task, setTask] = useState("");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Regenerate when selection or task changes
  const basePrompt = useMemo(
    () => buildFixPrompt(graph, selectedIds, { task: task || undefined }),
    [graph, selectedIds, task],
  );

  useEffect(() => {
    setText(basePrompt);
  }, [basePrompt]);

  useEffect(() => {
    if (open) {
      setTask(suggestedTask ?? "");
      setCopied(false);
    }
  }, [open, suggestedTask]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        copyToClipboard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text]);

  const nodesById = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );
  const selectedNodes: CausalNode[] = useMemo(
    () => selectedIds.map((id) => nodesById.get(id)).filter((n): n is CausalNode => Boolean(n)),
    [selectedIds, nodesById],
  );

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadFile = () => {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base =
      selectedNodes.length === 1
        ? selectedNodes[0].label.replace(/[^\w.-]+/g, "_")
        : `${graph.repo.replace("/", "-")}-${selectedNodes.length}-files`;
    a.download = `${base}.prompt.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-12 bottom-12 z-50 mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:inset-y-auto sm:top-[8vh] sm:bottom-auto sm:max-h-[85vh]"
          >
            {/* Header */}
            <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#E838A4]/30 bg-[#E838A4]/10">
                  <Sparkle size={14} weight="duotone" className="text-[#E838A4]" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-medium text-neutral-900">
                    Prompt · {selectedNodes.length === 1
                      ? selectedNodes[0].label
                      : `${selectedNodes.length} files`}
                  </h2>
                  <p className="truncate font-mono text-[10px] text-neutral-400">
                    paste into Claude Code, Cursor, Aider — or any agent with shell access
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X size={14} />
              </button>
            </header>

            {/* Selected files chip strip */}
            {selectedNodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b border-neutral-100 px-5 py-2.5">
                {selectedNodes.slice(0, 12).map((n) => (
                  <span
                    key={n.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] text-neutral-700"
                    title={n.summary ?? n.label}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: LAYER_COLORS[n.layer] }}
                    />
                    {n.label}
                  </span>
                ))}
                {selectedNodes.length > 12 && (
                  <span className="rounded-md bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-400">
                    +{selectedNodes.length - 12} more
                  </span>
                )}
              </div>
            )}

            {/* Task input */}
            <div className="border-b border-neutral-100 px-5 py-3">
              <label className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                <FileText size={10} /> Task (inserted into the prompt)
              </label>
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder='e.g. "refactor the error handling to use Result&lt;T, E&gt; types"'
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#E838A4]/50 focus:outline-none focus:ring-2 focus:ring-[#E838A4]/10"
              />
            </div>

            {/* Prompt body — editable */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  <FileText size={10} />
                  Prompt · markdown · {text.length.toLocaleString()} chars
                </div>
                <button
                  onClick={() => setText(basePrompt)}
                  className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-700"
                >
                  reset
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                className="flex-1 resize-none bg-white px-5 py-4 font-mono text-[12.5px] leading-[1.6] text-neutral-800 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <footer className="flex items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50/50 px-5 py-3">
              <span className="font-mono text-[10px] text-neutral-400">
                Cmd+Enter to copy · Esc to close
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadFile}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                >
                  <DownloadSimple size={12} />
                  Download .md
                </button>
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-medium text-white transition-all",
                    copied
                      ? "bg-emerald-500"
                      : "bg-neutral-900 hover:bg-neutral-800",
                  )}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy prompt"}
                  {!copied && <ArrowRight size={11} />}
                </button>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
