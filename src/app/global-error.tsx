"use client";

import { useEffect } from "react";

/**
 * Last-ditch error boundary — catches errors that escape the per-route
 * `error.tsx`. Replaces the browser's native "page couldn't load"
 * dark-mode page with our own light-mode reload prompt. Auto-reloads
 * for chunk-load failures.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/.test(error?.message ?? "") ||
    /ChunkLoadError/.test(error?.message ?? "");

  useEffect(() => {
    if (isChunkError && typeof window !== "undefined") {
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAF8",
          color: "#141413",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: 32 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#9ca3af",
              fontFamily: "ui-monospace, Menlo, monospace",
              marginBottom: 8,
            }}
          >
            {isChunkError ? "Refreshing" : "Something broke"}
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {isChunkError
              ? "Loading the latest build…"
              : "Causalist hit a snag."}
          </h1>
          {!isChunkError && (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  marginTop: 12,
                  marginBottom: 20,
                }}
              >
                {error?.message || "Unknown error."}
              </p>
              <div
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: "#E838A4",
                    color: "white",
                    border: 0,
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: "white",
                    color: "#374151",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Reload page
                </button>
              </div>
            </>
          )}
        </div>
      </body>
    </html>
  );
}
