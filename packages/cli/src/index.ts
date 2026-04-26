#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from "commander";
import kleur from "kleur";
import { map } from "./commands/map.js";
import { install } from "./commands/install.js";
import { pair } from "./commands/pair.js";
import { login } from "./commands/login.js";
import { projectCreate } from "./commands/project.js";
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
  .version("0.3.0");

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
  .command("login")
  .description(
    "Save a Causalist API key for this machine (mint at causalist.xyz/app/settings)",
  )
  .requiredOption("--api-key <key>", "Causalist API key (cspl_live_…)")
  .option("--web <url>", "base URL of the Causalist web app", "https://causalist.xyz")
  .action(login);

const projectCmd = program
  .command("project")
  .description("Manage your Causalist projects from the CLI");
projectCmd
  .command("create")
  .description("Create a new private project on your account")
  .argument("<url-or-slug>", "github URL or owner/repo")
  .option("--api-key <key>", "Causalist API key (overrides env / login)")
  .option("--nickname <name>", "friendly name shown in the projects list")
  .option("--web <url>", "base URL of the Causalist web app", "https://causalist.xyz")
  .action(projectCreate);

program
  .command("pair")
  .description(
    "[legacy] Pair this terminal with a browser tab via 6-char code. Prefer `causalist login --api-key`.",
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

${kleur.dim("examples — setup (recommended):")}
  ${kleur.cyan("$")} causalist login --api-key cspl_live_…   ${kleur.dim("# mint at causalist.xyz/app/settings")}
  ${kleur.cyan("$")} causalist project create vercel/swr     ${kleur.dim("# private project on your account")}
  ${kleur.cyan("$")} causalist install                       ${kleur.dim("# drop SKILL.md into ~/.claude/skills/")}

${kleur.dim("examples — legacy pair-code path:")}
  ${kleur.cyan("$")} causalist pair AB12CD                   ${kleur.dim("# only needed for live browser-tab streaming")}
  ${kleur.cyan("$")} causalist map vercel/next.js --open

${kleur.dim("env:")}
  CAUSALIST_API_KEY     API key from causalist.xyz/app/settings.
  ANTHROPIC_API_KEY     Required for local \`map\` (analyze calls).
  CAUSALIST_SESSION     Override active pair-session id (legacy).
  CAUSALIST_WEB         Override Causalist web base URL.
`,
);

program.parseAsync().catch((err) => {
  console.error(kleur.red(`✖ ${err instanceof Error ? err.message : err}`));
  process.exit(1);
});
