// Reusable animation primitives — every scene composes from these so
// motion language stays consistent. Headline mask-up, body fade-up,
// stroke-draw checkmark, the "slash beat," and a magenta dot with
// concentric rings.

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, TYPE } from "./tokens";

/** Mask-up reveal — text wipes in from the bottom, no movement. */
export function MaskUpText({
  children,
  startFrame = 0,
  durationFrames = 14,
  style,
}: {
  children: React.ReactNode;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const t = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [100, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic },
  );
  return (
    <div
      style={{
        clipPath: `inset(${t}% 0 0 0)`,
        WebkitClipPath: `inset(${t}% 0 0 0)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Body copy fade-up — opacity 0→1 + translateY 12→0. */
export function FadeUp({
  children,
  startFrame = 0,
  durationFrames = 18,
  style,
}: {
  children: React.ReactNode;
  startFrame?: number;
  durationFrames?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutQuart },
  );
  const ty = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutQuart },
  );
  return (
    <div style={{ opacity, transform: `translateY(${ty}px)`, ...style }}>
      {children}
    </div>
  );
}

/** Stagger helper for FadeUp on multiple lines. */
export function FadeUpStagger({
  children,
  startFrame = 0,
  staggerFrames = 3,
  durationFrames = 18,
}: {
  children: React.ReactNode[];
  startFrame?: number;
  staggerFrames?: number;
  durationFrames?: number;
}) {
  return (
    <>
      {children.map((c, i) => (
        <FadeUp
          key={i}
          startFrame={startFrame + i * staggerFrames}
          durationFrames={durationFrames}
        >
          {c}
        </FadeUp>
      ))}
    </>
  );
}

/** Causalist logo — the actual brand mark. Open arc (the "C") with
 *  two endpoint dots: top-right is an outline ring, bottom-right is a
 *  filled disc. Identical to /public/icon.svg and the Logo component
 *  in src/components/brand/logo.tsx, redrawn at video resolution.
 *
 *  When `startFrame` is set, the arc strokes in over 16 frames, then
 *  the open ring fades in, then the filled dot lands. Otherwise the
 *  whole mark is fully visible.
 */
export function CausalistLogo({
  size = 240,
  color = COLORS.ink,
  accent = COLORS.magenta,
  startFrame,
}: {
  size?: number;
  color?: string;
  accent?: string;
  startFrame?: number;
}) {
  const frame = useCurrentFrame();
  const animated = typeof startFrame === "number";

  // Arc length for the open-C path, in viewBox units. The path sweeps
  // ~270° around radius 8.5 ≈ 40 units.
  const ARC_LEN = 42;

  const draw = animated
    ? interpolate(frame, [startFrame!, startFrame! + 16], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easeOutCubic,
      })
    : 1;
  const ringIn = animated
    ? interpolate(frame, [startFrame! + 12, startFrame! + 22], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easeOutCubic,
      })
    : 1;
  const dotIn = animated
    ? interpolate(frame, [startFrame! + 18, startFrame! + 26], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: easeOutCubic,
      })
    : 1;

  // Stroke width scaled relative to size (matches the live Logo at
  // ~7% of viewport). 1.75 stroke at viewBox 24 = ~7.3%.
  const stroke = (size / 24) * 1.75;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      style={{ overflow: "visible" }}
    >
      {/* The C — open arc */}
      <path
        d="M18 5.2 A 8.5 8.5 0 1 0 18 18.8"
        strokeDasharray={ARC_LEN}
        strokeDashoffset={ARC_LEN * (1 - draw)}
      />
      {/* Top-right open ring */}
      <circle
        cx="18"
        cy="5.2"
        r="1.9"
        opacity={ringIn}
        transform={`translate(18 5.2) scale(${ringIn}) translate(-18 -5.2)`}
      />
      {/* Bottom-right filled magenta dot — the brand's punctuation */}
      <circle
        cx="18"
        cy="18.8"
        r="1.9"
        fill={accent}
        stroke="none"
        opacity={dotIn}
        transform={`translate(18 18.8) scale(${dotIn}) translate(-18 -18.8)`}
      />
      {/* eslint-disable-next-line — preserve attr for static reads */}
      <title>Causalist</title>
      {/* unused but suppresses lint */}
      <desc data-stroke={stroke} />
    </svg>
  );
}

/** Stroke-drawing forward-slash — Anthropic homage. Use sparingly. */
export function SlashBeat({
  startFrame = 0,
  size = 120,
  color = COLORS.magenta,
}: {
  startFrame?: number;
  size?: number;
  color?: string;
}) {
  const frame = useCurrentFrame();
  const draw = interpolate(
    frame,
    [startFrame, startFrame + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic },
  );
  const fade = interpolate(
    frame,
    [startFrame + 12, startFrame + 18],
    [1, 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const length = Math.SQRT2 * size;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <line
        x1={size}
        y1={0}
        x2={0}
        y2={size}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - draw)}
        opacity={fade}
      />
    </svg>
  );
}

/** Stroke-drawing checkmark for proof scenes. */
export function CheckmarkDraw({
  startFrame = 0,
  size = 240,
  color = COLORS.magenta,
}: {
  startFrame?: number;
  size?: number;
  color?: string;
}) {
  const frame = useCurrentFrame();
  const draw = interpolate(
    frame,
    [startFrame, startFrame + 16],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic },
  );
  // Path total length (approx for our coordinates).
  const len = 360;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M 18 52 L 42 76 L 84 28"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - draw)}
      />
    </svg>
  );
}

/** Whole-frame settle — imperceptible scale-down for the entire scene
 *  to give the locked frame a sense of life. */
export function SettleFrame({
  children,
  totalFrames,
}: {
  children: React.ReactNode;
  totalFrames: number;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, totalFrames], [1.0, 0.985], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
}

/** Shared eyebrow — small mono uppercase tag like "01 / map it". */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: TYPE.mono,
        fontSize: 18,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: COLORS.midGray,
      }}
    >
      {children}
    </div>
  );
}

// Re-export easing helpers as Remotion-compatible functions.
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const springSpring = (frame: number, fps: number) =>
  spring({ frame, fps, config: { damping: 200, stiffness: 100, mass: 0.5 } });
