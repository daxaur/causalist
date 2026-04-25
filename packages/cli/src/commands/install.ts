/* eslint-disable no-console */
// Drops the Causalist Skill into ~/.claude/skills/causalist/ — the
// canonical Anthropic location for Claude-Code-discoverable skills.
// Claude Code auto-loads description text from every SKILL.md, then
// expands the body when the user's request matches the trigger.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import kleur from "kleur";

interface InstallOpts {
  dir?: string;
}

export async function install(opts: InstallOpts): Promise<void> {
  const skillDir = opts.dir ?? resolve(homedir(), ".claude", "skills", "causalist");

  console.log(`${kleur.bold("▸")} Installing Causalist skill to ${kleur.cyan(skillDir)}`);

  await mkdir(skillDir, { recursive: true });

  // The SKILL.md ships in the package at packages/cli/skills/causalist/SKILL.md.
  // Resolve it relative to this file so it works whether the user
  // installed via `npm i -g`, `npx`, or `pnpm dlx`.
  const here = fileURLToPath(new URL(".", import.meta.url));
  const candidates = [
    // dist layout when shipped — packages/cli/dist/commands/install.js
    resolve(here, "..", "..", "skills", "causalist", "SKILL.md"),
    // dev layout — running tsx straight from src/
    resolve(here, "..", "..", "..", "skills", "causalist", "SKILL.md"),
  ];

  let skillBody: string | null = null;
  for (const candidate of candidates) {
    try {
      skillBody = await readFile(candidate, "utf-8");
      break;
    } catch {
      // try next
    }
  }

  if (!skillBody) {
    // Fallback: ship a minimal embedded skill so the install still
    // succeeds even if the package was bundled without the skill file.
    skillBody = EMBEDDED_FALLBACK_SKILL;
  }

  await writeFile(resolve(skillDir, "SKILL.md"), skillBody);

  console.log("");
  console.log(kleur.green("✓ Skill installed."));
  console.log("");
  console.log("  Next steps:");
  console.log(`    ${kleur.cyan("1.")} Pair this terminal:    ${kleur.bold("causalist pair <code>")}`);
  console.log(
    `    ${kleur.cyan("2.")} Verify Claude sees it: ${kleur.bold("claude /skills")} ${kleur.dim("(should list `causalist`)")}`,
  );
  console.log(
    `    ${kleur.cyan("3.")} Try it: ask Claude Code ${kleur.bold('"what tests cover src/auth/login.ts"')}`,
  );
  console.log("");
  console.log(
    kleur.dim(
      "  Optional: add the MCP server too — `claude mcp add causalist -- npx -y causalist-mcp@latest --session <code>`",
    ),
  );
  console.log("");
}

const EMBEDDED_FALLBACK_SKILL = `---
name: causalist
description: |
  Query a typed causal graph of any code repository paired with Causalist.
  TRIGGER on "what breaks if I change X", "what tests cover", "who writes to",
  "find path from A to B", "is this import real". Use the \`causalist\` CLI.
allowed-tools: Bash(causalist *) Bash(jq *)
---

# Causalist

Run \`causalist info --json\` to confirm the active session, then use
the appropriate subcommand:

- \`causalist blast <id> --json\` — what depends on this node
- \`causalist tests <ids...> --json\` — which tests are affected
- \`causalist path <a> <b> --json\` — shortest path
- \`causalist writers <id> --json\` — who writes to this state
- \`causalist verify <a> <b> --json\` — confirm an edge exists
- \`causalist similar <id> --json\` — similar nodes
- \`causalist topo <ids...> --json\` — build order
- \`causalist layer <name> --json\` — list a semantic layer
- \`causalist node <id> --json\` — single-node metadata
- \`causalist neighbors <id> --json\` — direct in/out

All commands emit JSON when piped or with --json. Exit 0 ok, 1 ok=false,
2 fatal (read stderr). Pipe through \`jq\` to extract just what you need.
`;
