"use client";

import { ReactElement, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, GithubLogo, Sparkle } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { PREVIEWS, type PreviewMeta } from "@/lib/graph/previews";

/**
 * Click a preview card → full-canvas Dialog with the 3D viewer inside.
 * Takes over the viewport at 95vw × 85vh. Clicking backdrop / pressing
 * Esc closes — the user stays on the landing page.
 */
export function PreviewDialog({
  preview,
  children,
}: {
  preview: PreviewMeta;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent
        className="h-[85vh] w-[min(1200px,calc(100vw-2rem))] max-w-none p-0 sm:max-w-none"
        showCloseButton={false}
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl">
          <header className="flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                <Sparkle size={10} weight="duotone" className="text-accent-magenta" />
                <span className="uppercase tracking-wider">live demo</span>
              </div>
              <div>
                <DialogTitle className="font-display text-[15px] font-medium tracking-tight text-neutral-900">
                  {preview.title}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-neutral-500">
                  {preview.tagline}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://github.com/${preview.graph.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[11px] text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <GithubLogo size={12} weight="fill" />
                source
              </a>
              <Link
                href={`/app/preview/${preview.slug}`}
                className="flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[11px] text-white transition-colors hover:bg-neutral-800"
              >
                Open full-screen
                <ArrowUpRight size={12} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                aria-label="Close"
              >
                <span aria-hidden className="text-lg leading-none">×</span>
              </button>
            </div>
          </header>
          <div className="relative flex-1">
            <CausalGraphViewer graph={preview.graph} showAgentBeam={false} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Convenience — look up preview by slug and render the dialog.
 * Returns null if the slug isn't known.
 */
export function PreviewDialogBySlug({
  slug,
  children,
}: {
  slug: string;
  children: ReactElement;
}) {
  const preview = PREVIEWS.find((p) => p.slug === slug);
  if (!preview) return children;
  return <PreviewDialog preview={preview}>{children}</PreviewDialog>;
}
