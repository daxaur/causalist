import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "form" | "prose" | "gallery" | "docs" | "full";

const WIDTH_CLASS: Record<Width, string> = {
  form: "max-w-2xl",
  prose: "max-w-4xl",
  gallery: "max-w-5xl",
  docs: "max-w-6xl",
  full: "max-w-none",
};

export function PageShell({
  width = "prose",
  className,
  children,
}: {
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-y-auto bg-[#FAFAF8] text-neutral-900">
      <div
        className={cn(
          "mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8",
          WIDTH_CLASS[width],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
