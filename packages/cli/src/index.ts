#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from "commander";
import kleur from "kleur";
import { map } from "./commands/map.js";
import { install } from "./commands/install.js";
import { pair } from "./commands/pair.js";
import { serve } from "./commands/serve.js";
import {
  registerHelpCommand,
  registerQueryCommands,
} from "./commands/query.js";

const program = new Command();

program
  .name("causalist")
  .description(
    "Causal graph CLI for any GitHub repo — paired with Claude Code via skill or MCP.",
  )
  .version("0.2.0");

// 11 graph-query subcommands (mirrors the MCP tool surface) — JSON
// to stdout for agents, plain text in TTY. These are the agent-first
// path; MCP server stays available for non-CLI clients.
registerQueryCommands(program);
registerHelpCommand(program);

program
  .command("map")
  .description("Generate a causal graph for a GitHub repository")
  .argument("<url-or-slug>", "github URL or owner/repo slug")
  .option("-o, --output <path>", "write graph JSON to a file instead of stdout")
  .option("--open", "open the graph in a browser when done", false)
  .option("--web <url>", "base URL of a running web app", "https://causalist.xyz")
  .action(map);

program
  .command("install")
  .description("Install the Causalist Claude Code skill (~/.claude/skills/causalist/)")
  .option("--dir <path>", "override skill install directory")
  .action(install);

program
  .command("pair")
  .description(
    "Pair this terminal with a browser tab so live Claude Code events stream to the graph",
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
${kleur.dim("examples — agent-first:")}
  ${kleur.cyan("$")} causalist blast src/auth/login.ts --json | jq '.data.affected[].id'
  ${kleur.cyan("$")} causalist tests src/auth/login.ts --json
  ${kleur.cyan("$")} causalist path components/Header.tsx lib/db.ts --json

${kleur.dim("examples — setup:")}
  ${kleur.cyan("$")} causalist pair AB12CD              ${kleur.dim("# pair browser")}
  ${kleur.cyan("$")} causalist install                  ${kleur.dim("# drop SKILL.md into ~/.claude/skills/")}
  ${kleur.cyan("$")} causalist map vercel/next.js --open

${kleur.dim("env:")}
  ANTHROPIC_API_KEY     Required for \`map\` (analyze calls).
  CAUSALIST_SESSION     Override active session id.
  CAUSALIST_WEB         Override Causalist web base URL.
`,
);

program.parseAsync().catch((err) => {
  console.error(kleur.red(`✖ ${err instanceof Error ? err.message : err}`));
  process.exit(1);
});
