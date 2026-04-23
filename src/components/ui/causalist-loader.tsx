"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Branded loader — a rotating arc + terminus echoing the Causalist
 * logo. Pairs with an optional caption underneath. Uses Framer's
 * infinite rotate so it stays smooth under load.
 */
export function CausalistLoader({
  size = 40,
  caption,
  sublabel,
  className,
}: {
  size?: number;
  caption?: string;
  sublabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-neutral-700",
        className,
      )}
    >
      <div className="relative" style={{ width: size * 1.6, height: size * 1.6 }}>
        {/* Outer ring — subtle track */}
        <div
          className="absolute inset-0 rounded-full border border-neutral-200"
          aria-hidden
        />
        {/* Rotating arc */}
        <motion.svg
          className="absolute inset-0"
          viewBox="0 0 64 64"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, ease: "linear", repeat: Infinity }}
          aria-hidden
        >
          <defs>
            <linearGradient id="causalist-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E838A4" stopOpacity="0" />
              <stop offset="60%" stopColor="#E838A4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#E838A4" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="url(#causalist-arc)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="110 180"
          />
        </motion.svg>

        {/* Center Terminus dot (Causalist logo tip) — subtle pulse */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-magenta"
          animate={{ scale: [1, 1.4, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
        />
      </div>

      {(caption || sublabel) && (
        <div className="text-center">
          {caption && (
            <div className="font-display text-sm font-medium tracking-tight text-neutral-900">
              {caption}
            </div>
          )}
          {sublabel && (
            <div className="mt-0.5 font-mono text-[11px] text-neutral-500">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tiny inline variant for use in buttons / rows. Matches the brand
 * palette without taking up space.
 */
export function CausalistSpinner({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
      className={cn("text-accent-magenta", className)}
      role="img"
      aria-label="Loading"
    >
      <path d="M18 5.2 A 8.5 8.5 0 1 0 18 18.8" opacity="0.9" />
      <circle cx="18" cy="18.8" r="1.6" fill="currentColor" stroke="none" />
    </motion.svg>
  );
}
