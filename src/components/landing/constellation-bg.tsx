"use client";

import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Normalized distance from the hero center (0 = dead center, 1 = corner). */
  heroDist?: number;
}

/**
 * Hero constellation background. The density is tuned to be prominent
 * but not compete with the foreground hero text — opacity falls off
 * toward the center vertical band so the headline stays readable.
 */
export function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Density: ~1 dot per 9k px² → a 1440×900 viewport gets ~140 dots
    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = Math.min(170, Math.floor((w * h) / 9000));
    pointsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: Math.random() * 1.8 + 0.6,
    }));

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);
    const onMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener("mouseleave", onMouseLeave);

    const connectionDistance = 180;
    const mouseDistance = 260;

    const animate = () => {
      if (!ctx || !canvas) return;
      const ww = canvas.width / dpr;
      const hh = canvas.height / dpr;
      ctx.clearRect(0, 0, ww, hh);

      const points = pointsRef.current;
      const mouse = mouseRef.current;

      // Update positions + compute per-point hero-band opacity.
      // The center 35% of the width is where the headline lives — dim
      // dots there so text stays readable. Dots near the top (nav) and
      // toward the edges glow normally.
      const centerX = ww / 2;
      const heroBand = ww * 0.18; // half-width of dim band
      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > ww) p.vx *= -1;
        if (p.y < 0 || p.y > hh) p.vy *= -1;
        p.x = Math.max(0, Math.min(ww, p.x));
        p.y = Math.max(0, Math.min(hh, p.y));

        // How much inside the hero band are we? 0 = outside, 1 = dead center
        const dx = Math.abs(p.x - centerX);
        const insideBand = Math.max(0, 1 - dx / heroBand);
        // Top 30% of viewport is the headline — strongest dim there
        const topBand = Math.max(0, 1 - p.y / (hh * 0.55));
        p.heroDist = insideBand * topBand;
      }

      // Draw proximity connections (dots → dots)
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i];
          const b = points[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < connectionDistance * connectionDistance) {
            const dist = Math.sqrt(dist2);
            const proximity = 1 - dist / connectionDistance;
            const heroDim = 1 - 0.75 * Math.max(a.heroDist ?? 0, b.heroDist ?? 0);
            const opacity = proximity * 0.24 * heroDim;
            if (opacity < 0.01) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(15,15,20,${opacity})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }
      }

      // Draw mouse-to-point connections — magenta accent so the cursor
      // feels like an extra star in the constellation
      for (const p of points) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseDistance) {
          const heroDim = 1 - 0.55 * (p.heroDist ?? 0);
          const opacity = (1 - dist / mouseDistance) * 0.5 * heroDim;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(232,56,164,${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw points
      for (const p of points) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nearMouse = dist < mouseDistance;
        const heroDim = 1 - 0.7 * (p.heroDist ?? 0);
        const baseOpacity = 0.42 * heroDim;

        if (nearMouse) {
          // Outer glow
          const glowOpacity =
            (1 - dist / mouseDistance) * 0.35 * heroDim;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232,56,164,${glowOpacity})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, nearMouse ? p.radius * 1.6 : p.radius, 0, Math.PI * 2);
        ctx.fillStyle = nearMouse
          ? `rgba(232,56,164,${0.9 * heroDim})`
          : `rgba(15,15,20,${baseOpacity})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0"
      style={{ height: "100vh" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Fade the constellation out below the hero so the features
          section reads as its own, quiet thing. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))",
        }}
      />
    </div>
  );
}
