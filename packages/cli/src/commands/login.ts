/* eslint-disable no-console */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import kleur from "kleur";

interface LoginOpts {
  apiKey?: string;
  web?: string;
}

/**
 * `causalist login --api-key <KEY>`
 *
 * Replaces the older 6-char pair-code dance for the common agent /
 * automation case. The user mints a key in causalist.xyz/app/settings,
 * pastes it here once, and from then on every CLI / MCP call uses it.
 *
 * The key is written to ~/.causalist/config.json AND the existing
 * ~/.causalist/session.json (alongside any pair session, if present),
 * so both the legacy session loader and the new API path read the
 * same file.
 */
export async function login(opts: LoginOpts): Promise<void> {
  const web = (opts.web ?? "https://causalist.xyz").replace(/\/$/, "");
  const apiKey = opts.apiKey?.trim();
  if (!apiKey) {
    throw new Error(
      "Pass --api-key <KEY>. Mint one at " + web + "/app/settings",
    );
  }
  if (!apiKey.startsWith("cspl_live_")) {
    throw new Error(
      "Key doesn't look like a Causalist key (expected prefix cspl_live_).",
    );
  }

  // Verify the key by hitting GET /api/projects (echoes the owner).
  console.log(`${kleur.dim("→")} Verifying key at ${kleur.cyan(web)}`);
  const res = await fetch(`${web}/api/projects`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Login failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as {
    user?: { login?: string; id?: number };
    keyName?: string;
  };

  // Merge into ~/.causalist/session.json so existing tooling that
  // reads sessionId/token still works.
  const dir = resolve(homedir(), ".causalist");
  await mkdir(dir, { recursive: true });
  const sessionFile = resolve(dir, "session.json");
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(sessionFile, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    // first-run is fine
  }
  await writeFile(
    sessionFile,
    JSON.stringify(
      {
        ...existing,
        apiKey,
        loggedInAs: data.user?.login,
        loggedInAt: Date.now(),
        web,
      },
      null,
      2,
    ),
  );

  console.log(
    kleur.green(`✓ Logged in as @${data.user?.login ?? "(unknown)"}`),
  );
  console.log("");
  console.log(`  ${kleur.dim("key name:")} ${data.keyName ?? "(unnamed)"}`);
  console.log(`  ${kleur.dim("saved to:")} ${sessionFile}`);
  console.log("");
  console.log(
    `  Try: ${kleur.bold("causalist project create vercel/swr")}`,
  );
  console.log(
    `  Or set ${kleur.cyan("CAUSALIST_API_KEY=" + apiKey.slice(0, 14) + "…")} for shell-wide use.`,
  );
}
