"use client";

// BuildConfigModal — centered popup that lets the user pick which of
// the 4 builder agents to run, what model each uses, and then hits
// Run. Opens automatically on /app/[owner]/[repo] when no graph yet
// exists. Closes on Run; the LiveBuildView underneath then streams.
//
// Structure + Oracle are required — Structure produces the node list
// every other stage depends on; Oracle synthesizes the canonical
// graph. Dependency + Semantic are optional toggles.

import { useMemo } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModelPill } from "@/components/agents/model-pill";
import { Logo } from "@/components/brand/logo";
import { BUILDER_AGENTS, type BuilderAgentId } from "@/lib/analyze/prompts";
import { cn } from "@/lib/utils";

const REQUIRED: ReadonlySet<BuilderAgentId> = new Set([
  "structure",
  "oracle",
]);

interface Props {
  open: boolean;
  owner: string;
  repo: string;
  models: Record<BuilderAgentId, string>;
  onModelChange: (id: BuilderAgentId, model: string) => void;
  enabled: Record<BuilderAgentId, boolean>;
  onEnabledChange: (id: BuilderAgentId, value: boolean) => void;
  onRun: () => void;
  onClose: () => void;
}

export function BuildConfigModal({
  open,
  owner,
  repo,
  models,
  onModelChange,
  enabled,
  onEnabledChange,
  onRun,
  onClose,
}: Props) {
  const enabledCount = useMemo(
    () => BUILDER_AGENTS.filter((a) => enabled[a.id]).length,
    [enabled],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[520px] gap-0 overflow-hidden bg-white p-0 sm:max-w-[520px]"
      >
        {/* Header */}
        <div className="border-b border-neutral-200 px-6 pb-4 pt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Configure build
          </div>
          <DialogTitle className="mt-1 font-display text-[20px] font-medium tracking-[-0.01em] text-neutral-900">
            Map{" "}
            <span className="font-mono text-[0.8em] text-neutral-500">
              {owner}/{repo}
            </span>
          </DialogTitle>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500">
            Pick which agents run and what model each uses. Defaults: all 4
            agents on Opus 4.7.
          </p>
        </div>

        {/* Agent rows */}
        <div className="divide-y divide-neutral-100 bg-neutral-50/40 px-6 py-1">
          {BUILDER_AGENTS.map((a) => {
            const required = REQUIRED.has(a.id);
            const isOn = enabled[a.id];
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-center gap-3 py-2.5 transition-opacity",
                  !isOn && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => !required && onEnabledChange(a.id, !isOn)}
                  disabled={required}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    isOn
                      ? "border-neutral-900 bg-neutral-900"
                      : "border-neutral-300 bg-white",
                    required && "cursor-not-allowed",
                    !required && "hover:border-neutral-500",
                  )}
                  title={
                    required
                      ? `${a.name} is required`
                      : isOn
                        ? `Disable ${a.name}`
                        : `Enable ${a.name}`
                  }
                >
                  {isOn && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-white"
                    >
                      <path d="M2.5 6.5 5 9l4.5-5" />
                    </svg>
                  )}
                </button>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="font-display text-[13.5px] font-medium text-neutral-900">
                    {a.name}
                  </span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    {a.role}
                  </span>
                  {required && (
                    <span className="ml-auto rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                      required
                    </span>
                  )}
                </div>
                <ModelPill
                  size="sm"
                  value={models[a.id]}
                  onChange={(m) => onModelChange(a.id, m)}
                  disabled={!isOn}
                />
              </div>
            );
          })}
        </div>

        {/* Footer note + Run */}
        <div className="border-t border-neutral-200 bg-white px-6 py-4">
          {enabledCount < 4 && (
            <p className="mb-3 text-[11.5px] leading-relaxed text-amber-700">
              Running with {enabledCount} agents. Skipping Dependency drops
              edge extraction; skipping Semantic drops per-node summaries.
              Quality and accuracy will be lower.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
            >
              Cancel
            </button>
            <Button
              onClick={onRun}
              className="h-11 bg-[#E838A4] px-5 text-[13.5px] font-medium text-white hover:bg-[#C92E8E]"
            >
              <Logo size={15} className="mr-2 text-white" />
              Run {enabledCount}-agent build
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
