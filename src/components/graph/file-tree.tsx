"use client";

import { useMemo, useState } from "react";
import {
  CaretDown,
  CaretRight,
  FileCode,
  Folder,
  FolderOpen,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAYER_COLORS, type CausalNode } from "@/lib/graph/types";

interface TreeNode {
  name: string;
  path: string;
  node?: CausalNode;
  children: TreeNode[];
}

function buildTree(nodes: CausalNode[]): TreeNode {
  const root: TreeNode = { name: "/", path: "", children: [] };
  for (const n of nodes) {
    if (!n.path) continue;
    const parts = n.path.split("/");
    let cursor = root;
    let walked = "";
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      walked = walked ? `${walked}/${seg}` : seg;
      let next = cursor.children.find((c) => c.name === seg);
      if (!next) {
        next = { name: seg, path: walked, children: [] };
        cursor.children.push(next);
      }
      if (i === parts.length - 1) next.node = n;
      cursor = next;
    }
  }
  // sort: dirs first, then files
  const sortTree = (t: TreeNode) => {
    t.children.sort((a, b) => {
      const aIsDir = a.children.length > 0;
      const bIsDir = b.children.length > 0;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    t.children.forEach(sortTree);
  };
  sortTree(root);
  return root;
}

export function FileTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: CausalNode[];
  selectedId: string | null;
  onSelect: (n: CausalNode) => void;
}) {
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const externals = useMemo(
    () => nodes.filter((n) => n.kind === "external" || !n.path),
    [nodes],
  );
  const unmappedCount = nodes.length - nodes.filter((n) => n.path).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          files
        </div>
        <div className="mt-0.5 text-xs text-white/70">
          {nodes.length} nodes · {unmappedCount} external
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 text-xs">
        {tree.children.map((c) => (
          <TreeRow
            key={c.path}
            node={c}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
        {externals.length > 0 && (
          <div className="mt-3 border-t border-white/5 pt-3">
            <div className="mb-1 px-2 font-mono text-[10px] uppercase tracking-wider text-white/30">
              externals
            </div>
            {externals.map((n) => (
              <button
                key={n.id}
                onClick={() => onSelect(n)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors",
                  selectedId === n.id
                    ? "bg-[#d97757]/15 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LAYER_COLORS[n.layer] }}
                />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (n: CausalNode) => void;
}) {
  const isDir = node.children.length > 0;
  const [open, setOpen] = useState(depth < 2);
  const isSelected = node.node?.id === selectedId;

  if (!isDir && node.node) {
    const n = node.node;
    return (
      <button
        onClick={() => onSelect(n)}
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left transition-colors",
          isSelected
            ? "bg-[#d97757]/15 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white",
        )}
      >
        <FileCode size={11} className="shrink-0 text-white/30" />
        <span className="truncate">{node.name}</span>
        <span
          className="ml-auto h-1 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: LAYER_COLORS[n.layer] }}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ paddingLeft: `${depth * 10 + 4}px` }}
        className="flex w-full items-center gap-1 rounded-md py-1 pr-2 text-left text-white/70 transition-colors hover:bg-white/5 hover:text-white"
      >
        {open ? (
          <CaretDown size={10} className="shrink-0 text-white/40" />
        ) : (
          <CaretRight size={10} className="shrink-0 text-white/40" />
        )}
        {open ? (
          <FolderOpen size={11} className="shrink-0 text-white/50" />
        ) : (
          <Folder size={11} className="shrink-0 text-white/50" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {open && (
        <div>
          {node.children.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
