import type { NextRequest } from "next/server";
import { claimCode } from "@/lib/pair/store";
import { publish } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pair/setup?code=ABC234
 *
 * Returns a bash script that claims the pair code and writes
 * ~/.causalist/session.json on the user's machine — no CLI install
 * required. One command, copy-paste:
 *
 *   curl -sSL 'https://causalist.xyz/api/pair/setup?code=ABC234' | sh
 *
 * Single-use (the pair code is consumed on first run). The response
 * includes plain-text `echo` lines with the export vars so the user
 * sees them in their terminal.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return new Response("# causalist: missing ?code=<six-char-code>\n", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }
  const claim = await claimCode(code.toUpperCase());
  if (!claim) {
    return new Response(
      `# causalist: code ${code.toUpperCase()} is invalid or already used.\n# Generate a new one at https://causalist.xyz/pair\n`,
      {
        status: 410,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }

  // Notify the browser tab listening on /api/stream/<session>
  publish(claim.sessionId, {
    event: "paired",
    ts: Date.now(),
    claimedAt: claim.claimedAt,
  });

  const body = `#!/bin/sh
# Causalist pair — generated one-time setup script.
# Writes ~/.causalist/session.json and prints the shell exports.
set -e

DIR="$HOME/.causalist"
mkdir -p "$DIR"

cat > "$DIR/session.json" <<'CAUSALIST_JSON'
${JSON.stringify(
  {
    sessionId: claim.sessionId,
    token: claim.token,
    paired: "https://causalist.xyz",
    claimedAt: claim.claimedAt,
  },
  null,
  2,
)}
CAUSALIST_JSON

echo ""
echo "✓ Paired with https://causalist.xyz"
echo "  session: ${claim.sessionId}"
echo "  saved to: $DIR/session.json"
echo ""
echo "Add these to the shell rc you launch Claude Code in:"
echo ""
echo "  export CAUSALIST_SESSION=${claim.sessionId}"
echo "  export CAUSALIST_TOKEN=${claim.token}"
echo ""
echo "Your browser tab will flip to 'Paired' — tool-use events now stream in live."
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
