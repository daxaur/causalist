/* eslint-disable no-console */
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import kleur from "kleur";

interface InstallOpts {
  dir?: string;
}

export async function install(opts: InstallOpts): Promise<void> {
  const pluginDir = opts.dir ?? resolve(homedir(), ".causalist", "plugin");

  console.log(`${kleur.bold("▸")} Installing Causalist plugin to ${kleur.cyan(pluginDir)}`);

  await mkdir(resolve(pluginDir, ".claude-plugin"), { recursive: true });
  await mkdir(resolve(pluginDir, "skills", "map"), { recursive: true });

  await writeFile(
    resolve(pluginDir, ".claude-plugin", "plugin.json"),
    JSON.stringify(
      {
        name: "causalist",
        description: "Map any GitHub repo into a 3D causal graph, inside Claude Code.",
        version: "0.1.0",
        author: "daxaur",
        homepage: "https://github.com/daxaur/causalist",
      },
      null,
      2,
    ),
  );

  await writeFile(
    resolve(pluginDir, "skills", "map", "SKILL.md"),
    [
      "---",
      "name: map",
      "description: Generate a 3D causal graph for a GitHub repository. Use when the user asks to visualize, map, explore, or understand a codebase.",
      "---",
      "",
      "# /causalist:map",
      "",
      "Given a GitHub URL or `owner/repo` slug, run `causalist map $ARGUMENTS --open`.",
      "",
      "The CLI streams progress through four Claude agents (Structure, Dependency,",
      "Semantic, Oracle) and returns a `CausalGraph` JSON. Open the returned URL",
      "in the user's browser to show the 3D graph.",
    ].join("\n"),
  );

  await writeFile(
    resolve(pluginDir, ".mcp.json"),
    JSON.stringify(
      {
        mcpServers: {
          causalist: {
            command: "npx",
            args: ["-y", "causalist-mcp@latest"],
            env: {},
          },
        },
      },
      null,
      2,
    ),
  );

  const binPath = resolve(pluginDir, "bin", "causalist");
  await mkdir(resolve(pluginDir, "bin"), { recursive: true });
  await writeFile(
    binPath,
    [
      "#!/usr/bin/env bash",
      'exec npx -y causalist "$@"',
    ].join("\n"),
  );
  await chmod(binPath, 0o755);

  console.log("");
  console.log(kleur.green("✓ Plugin installed."));
  console.log("");
  console.log("  Next steps:");
  console.log(`    ${kleur.cyan("1.")} In Claude Code, run: ${kleur.bold("/plugin install --local " + pluginDir)}`);
  console.log(`    ${kleur.cyan("2.")} Restart Claude Code or run ${kleur.bold("/reload-plugins")}`);
  console.log(`    ${kleur.cyan("3.")} Try: ${kleur.bold("/causalist:map vercel/next.js")}`);
  console.log("");
}
