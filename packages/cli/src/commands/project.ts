/* eslint-disable no-console */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import kleur from "kleur";

interface ProjectCreateOpts {
  apiKey?: string;
  nickname?: string;
  web?: string;
}

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;
const SLUG = /^([\w.-]+)\/([\w.-]+)$/;

/**
 * `causalist project create <github-url-or-slug>`
 *
 * Creates a new private project on the user's account. Requires an
 * API key (mint at causalist.xyz/app/settings) — the CLI reads it
 * from --api-key, $CAUSALIST_API_KEY, or ~/.causalist/session.json.
 */
export async function projectCreate(
  urlOrSlug: string,
  opts: ProjectCreateOpts,
): Promise<void> {
  const m =
    urlOrSlug.match(GITHUB_URL) ?? urlOrSlug.trim().match(SLUG);
  if (!m) {
    throw new Error(
      `Couldn't parse "${urlOrSlug}" — pass a github.com URL or owner/repo.`,
    );
  }
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, "");

  const apiKey = await resolveApiKey(opts.apiKey);
  if (!apiKey) {
    throw new Error(
      "No API key found. Run `causalist login --api-key <KEY>` first " +
        "(mint one at causalist.xyz/app/settings), or set CAUSALIST_API_KEY.",
    );
  }
  const web =
    (opts.web ??
      process.env.CAUSALIST_WEB ??
      "https://causalist.xyz").replace(/\/$/, "");

  console.log(
    `${kleur.dim("→")} Creating project ${kleur.bold(owner + "/" + repo)} at ${kleur.cyan(web)}`,
  );
  const res = await fetch(`${web}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ owner, repo, nickname: opts.nickname }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    viewerUrl?: string;
    project?: { owner: string; repo: string };
  };
  if (!res.ok) {
    throw new Error(
      `Create failed: ${res.status} ${body.error ?? res.statusText}`,
    );
  }

  console.log(kleur.green(`✓ Project created`));
  console.log("");
  console.log(`  ${kleur.dim("repo:")}     ${owner}/${repo}`);
  if (body.viewerUrl) {
    console.log(`  ${kleur.dim("viewer:")}   ${kleur.cyan(body.viewerUrl)}`);
  }
  console.log("");
  console.log(
    `  Open the viewer in a browser signed in with the same GitHub identity to run the build.`,
  );
}

async function resolveApiKey(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  if (process.env.CAUSALIST_API_KEY) return process.env.CAUSALIST_API_KEY;
  try {
    const file = resolve(homedir(), ".causalist", "session.json");
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as { apiKey?: string };
    if (parsed.apiKey) return parsed.apiKey;
  } catch {
    // no-op
  }
  return null;
}
