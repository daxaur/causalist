"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Cube,
  Fire,
  LinkSimple,
  Sparkle,
  FileText,
  X,
} from "@phosphor-icons/react";
import type { CausalGraph, CausalNode } from "@/lib/graph/types";
import { LAYER_COLORS } from "@/lib/graph/types";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  graph,
  onSelectNode,
  actions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  graph: CausalGraph;
  onSelectNode: (node: CausalNode) => void;
  actions: PaletteAction[];
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  const runAction = (a: PaletteAction) => {
    a.run();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to a node or run an action. Type to filter."
    >
      <CommandInput
        value={value}
        onValueChange={setValue}
        placeholder="Search nodes, run actions…"
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty className="px-4 py-6 text-sm text-neutral-400">
          No match. Try a different query.
        </CommandEmpty>

        {actions.length > 0 && (
          <CommandGroup heading="Actions">
            {actions.map((a) => (
              <CommandItem
                key={a.id}
                value={`action ${a.id} ${a.label}`}
                onSelect={() => runAction(a)}
                className="flex items-center gap-2"
              >
                <span className="text-[#E838A4]">{a.icon ?? <Sparkle size={12} weight="duotone" />}</span>
                <span className="flex-1 truncate">{a.label}</span>
                {a.hint && (
                  <span className="font-mono text-[10px] text-neutral-400">
                    {a.hint}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Nodes">
          {graph.nodes.slice(0, 200).map((n) => (
            <CommandItem
              key={n.id}
              value={`${n.label} ${n.path ?? ""} ${n.id}`}
              onSelect={() => {
                onSelectNode(n);
                onOpenChange(false);
              }}
              className="flex items-center gap-2"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: LAYER_COLORS[n.layer] }}
              />
              <span className="truncate text-neutral-900">{n.label}</span>
              {n.path && (
                <span className="ml-auto truncate font-mono text-[10px] text-neutral-400">
                  {n.path}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
