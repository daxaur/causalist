/* eslint-disable no-console */
import { writeFile } from "node:fs/promises";
import kleur from "kleur";
import ora from "ora";
import open from "open";
import { resolveRepo } from "../lib/resolve-repo.js";
import { analyze } from "../lib/analyze.js";

interface MapOpts {
  output?: string;
  open?: boolean;
  web?: string;
}

export async function map(target: string, opts: MapOpts): Promise<void> {
  const repo = resolveRepo(target);
  if (!repo) {
    throw new Error(
      `Couldn't parse "${target}" — expected owner/repo or a github.com URL`,
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is required. Set it in your environment or run `causalist install` first.",
    );
  }

  console.log(
    `${kleur.bold("▸")} Mapping ${kleur.cyan(repo.owner + "/" + repo.name)}`,
  );

  const steps = [
    { label: "Fetching repo tree" },
    { label: "Structure agent — classifying nodes" },
    { label: "Dependency agent — extracting edges" },
    { label: "Semantic agent — writing summaries" },
    { label: "Oracle — synthesizing graph" },
  ];

  const graph = await analyze({
    owner: repo.owner,
    name: repo.name,
    anthropicKey: apiKey,
    githubToken: process.env.GITHUB_TOKEN,
    onProgress: (stage) => {
      const s = steps[stage];
      if (s) ora(s.label).start().succeed(s.label);
    },
  });

  if (opts.output) {
    await writeFile(opts.output, JSON.stringify(graph, null, 2));
    console.log(
      kleur.green(`✓ wrote ${kleur.bold(opts.output)} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`),
    );
  } else {
    process.stdout.write(JSON.stringify(graph, null, 2) + "\n");
  }

  if (opts.open && opts.web) {
    const url = `${opts.web.replace(/\/$/, "")}/${repo.owner}/${repo.name}`;
    await open(url);
    console.log(kleur.dim(`↗ opened ${url}`));
  }
}
