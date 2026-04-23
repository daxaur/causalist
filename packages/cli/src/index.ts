#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from "commander";
import kleur from "kleur";
import { map } from "./commands/map.js";
import { install } from "./commands/install.js";
import { pair } from "./commands/pair.js";
import { serve } from "./commands/serve.js";

const program = new Command();

program
  .name("causalist")
  .description(
    "See what your code actually means. In 3D.\nMap any GitHub repo into a causal graph.",
  )
  .version("0.1.0");

program
  .command("map")
  .description("Generate a causal graph for a GitHub repository")
  .argument("<url-or-slug>", "github URL or owner/repo slug")
  .option("-o, --output <path>", "write graph JSON to a file instead of stdout")
  .option("--open", "open the graph in a browser when done", false)
  .option("--web <url>", "base URL of a running web app", "https://causalist.dev")
  .action(map);

program
  .command("install")
  .description("Install Causalist as a Claude Code plugin")
  .option("--dir <path>", "override plugin install directory")
  .action(install);

program
  .command("pair")
  .description(
    "Pair this terminal with a browser tab — the tab will receive live Claude Code events from this session",
  )
  .argument("<code>", "6-char pair code from causalist.xyz/pair")
  .option("--web <url>", "base URL of the Causalist web app", "https://causalist.xyz")
  .action(pair);

program
  .command("serve")
  .description("Run a local web UI at http://localhost:4141")
  .option("-p, --port <port>", "port to serve on", "4141")
  .action(serve);

program.addHelpText(
  "after",
  `
${kleur.dim("examples:")}
  ${kleur.cyan("$")} causalist map vercel/next.js --open
  ${kleur.cyan("$")} causalist map https://github.com/pallets/flask -o flask.json
  ${kleur.cyan("$")} causalist install   ${kleur.dim("# installs Claude Code plugin")}

${kleur.dim("env:")}
  ANTHROPIC_API_KEY    Required for analyze calls
  GITHUB_TOKEN         Optional, required for private repos
`,
);

program.parseAsync().catch((err) => {
  console.error(kleur.red(`✖ ${err instanceof Error ? err.message : err}`));
  process.exit(1);
});
