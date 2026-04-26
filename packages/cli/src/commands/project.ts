/* eslint-disable no-console */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import kleur from "kleur";
import ora from "ora";
import { analyze } from "../lib/analyze.js";

interface ProjectCreateOpts {
  apiKey?: string;
  nickname?: string;
  web?: string;
  /** Skip the local build — just register the project shell and let
   *  the user open the viewer URL to build in-browser. */
  noBuild?: boolean;
}

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;
const SLUG = /^([\w.-]+)\/([\w.-]+)$/;

/**
 * `causalist project create <github-url-or-slug>`
 *
 * Default behavior: runs the full 4-agent build LOCALLY using
 * $ANTHROPIC_API_KEY, then uploads the resulting graph to the user's
 * Causalist account via /api/projects/upload-graph. The browser tab
 * (if open) saves it to the library on receipt.
 *
 * With --no-build: registers the project shell only and returns the
 * viewer URL — the user must open it in a browser to run the build.
 */
export async function projectCreate(
  urlOrSlug: string,
  opts: ProjectCreateOpts,
): Promise<void> {
  const m = urlOrSlug.match(GITHUB_URL) ?? urlOrSlug.trim().match(SLUG);
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
  const web = (opts.web ??
    process.env.CAUSALIST_WEB ??
    "https://causalist.xyz").replace(/\/$/, "");

  // ── Path A: --no-build — register only ──────────────────────────
  if (opts.noBuild) {
    return registerOnly({
      owner,
      repo,
      nickname: opts.nickname,
      web,
      apiKey,
    });
  }

  // ── Path B: full local build + upload (default) ─────────────────
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (!anthropic) {
    throw new Error(
      "ANTHROPIC_API_KEY is required to build the graph locally. " +
        "Either set it in your environment, or pass --no-build to just " +
        "register the project shell and build later in the browser.",
    );
  }

  console.log(
    `${kleur.bold("▸")} Building ${kleur.cyan(owner + "/" + repo)} locally`,
  );
  console.log(
    `  ${kleur.dim("4 agents · streaming via Anthropic SDK · uploads to your Causalist account on completion")}`,
  );
  console.log("");

  const labels = [
    "Fetching repo tree from GitHub",
    "Structure agent — classifying nodes",
    "Dependency agent — extracting edges",
    "Semantic agent — writing summaries",
    "Oracle — synthesizing the final graph",
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activeSpinner: any = null;
  const startStep = (i: number) => {
    if (activeSpinner) activeSpinner.succeed();
    if (labels[i]) activeSpinner = ora(labels[i]).start();
  };

  let graph;
  try {
    graph = await analyze({
      owner,
      name: repo,
      anthropicKey: anthropic,
      githubToken: process.env.GITHUB_TOKEN,
      onProgress: (stage) => startStep(stage),
    });
    if (activeSpinner) activeSpinner.succeed();
  } catch (e) {
    if (activeSpinner) activeSpinner.fail();
    throw e;
  }

  console.log("");
  console.log(
    `  ${kleur.green("✓")} Built ${kleur.bold(`${graph.nodes.length} nodes`)} · ${kleur.bold(`${graph.edges.length} edges`)}`,
  );

  // Upload to user's account
  const upload = ora("Uploading to your Causalist account").start();
  try {
    const res = await fetch(`${web}/api/projects/upload-graph`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        owner,
        repo,
        nickname: opts.nickname,
        graph,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      viewerUrl?: string;
      persisted?: boolean;
    };
    if (!res.ok) {
      upload.fail();
      throw new Error(
        `Upload failed: ${res.status} ${body.error ?? res.statusText}`,
      );
    }
    upload.succeed("Uploaded");
    console.log("");
    console.log(`  ${kleur.dim("repo:")}     ${owner}/${repo}`);
    if (body.viewerUrl) {
      console.log(`  ${kleur.dim("viewer:")}   ${kleur.cyan(body.viewerUrl)}`);
    }
    if (body.persisted) {
      console.log(
        `  ${kleur.dim("persisted:")} yes (will load on next browser visit)`,
      );
    }
    console.log("");
    console.log(
      `  Open the viewer to explore. If your /app tab is open, the project just appeared in your library.`,
    );
  } catch (e) {
    if (!upload.isSpinning) {
      // already failed
    } else {
      upload.fail();
    }
    throw e;
  }
}

async function registerOnly(args: {
  owner: string;
  repo: string;
  nickname?: string;
  web: string;
  apiKey: string;
}): Promise<void> {
  console.log(
    `${kleur.dim("→")} Registering project ${kleur.bold(args.owner + "/" + args.repo)} at ${kleur.cyan(args.web)}`,
  );
  const res = await fetch(`${args.web}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      owner: args.owner,
      repo: args.repo,
      nickname: args.nickname,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    viewerUrl?: string;
  };
  if (!res.ok) {
    throw new Error(
      `Register failed: ${res.status} ${body.error ?? res.statusText}`,
    );
  }
  console.log(kleur.green(`✓ Registered`));
  console.log("");
  console.log(`  ${kleur.dim("repo:")}     ${args.owner}/${args.repo}`);
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
