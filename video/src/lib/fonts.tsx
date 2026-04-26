// Brand-font loader for Remotion. The web app pulls Clash Display +
// Satoshi from Fontshare (see src/app/layout.tsx); the video must use
// the same families so cuts feel like the product. Without this,
// Remotion silently falls back to system fonts and the video looks
// nothing like the brand.

import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const FONTS_CSS_URL =
  "https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&f[]=satoshi@300,400,500,700&display=swap";

let fontsPromise: Promise<void> | null = null;

async function ensureFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    // Inject the @font-face declarations into the document head so
    // the browser can load + apply them. The actual font files
    // (woff2) are fetched lazily by the browser when a glyph hits
    // the page.
    if (typeof document !== "undefined") {
      const id = "fontshare-brand-fonts";
      if (!document.getElementById(id)) {
        const css = await fetch(FONTS_CSS_URL).then((r) => r.text());
        const style = document.createElement("style");
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
      }
      // Wait for at least one weight of each family to finish
      // loading. document.fonts.load() returns a promise per family.
      const families = [
        "500 16px 'Clash Display'",
        "400 16px 'Satoshi'",
      ];
      // FontFaceSet.load is widely supported in Chromium (Remotion's
      // renderer uses Chromium under the hood).
      await Promise.all(
        families.map((f) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (document as any).fonts?.load(f).catch(() => {}),
        ),
      );
      // Also wait for the global ready signal so any other in-flight
      // weights settle before we paint the first frame.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (document as any).fonts?.ready?.catch?.(() => {});
    }
  })();
  return fontsPromise;
}

/** Wrap a scene so Remotion blocks the first paint until brand fonts
 *  are loaded. Use it as the root of every Composition's component. */
export function WithFonts({ children }: { children: React.ReactNode }) {
  const [handle] = useState(() => delayRender("brand-fonts"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureFonts()
      .then(() => {
        if (cancelled) return;
        setReady(true);
        continueRender(handle);
      })
      .catch(() => {
        // Don't block the render forever if the network is down.
        if (cancelled) return;
        setReady(true);
        continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!ready) return null;
  return <>{children}</>;
}
