// Shared motion language. Keep all framer-motion timings in the app
// pinned to these constants so panels, modals, and overlays move with
// the same physics. The goal: nothing in the chrome competes with the
// graph itself for attention.
//
// Easing is the same `outQuart`-ish curve used in the IDE right panel
// (`right-panel.tsx`). Standard duration is 220ms — fast enough to
// feel responsive, slow enough that quick switches don't feel jittery.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const STD_DURATION = 0.22;

/** Soft slide-up + fade-in. Drop into Framer Motion's `initial`/
 *  `animate`/`exit` props or use as a variants map. */
export const slideUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: STD_DURATION, ease: EASE_OUT },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: STD_DURATION, ease: EASE_OUT },
};

/** Standard transition prop — useful inline. */
export const stdTransition = {
  duration: STD_DURATION,
  ease: EASE_OUT,
} as const;

/** Stagger-children variant for small lists. Replaces hand-rolled
 *  `delay: i * 0.04` patterns. Pair with a child variant that has
 *  its own `transition`. */
export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      ease: EASE_OUT,
    },
  },
};
