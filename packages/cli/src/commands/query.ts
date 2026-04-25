/* eslint-disable no-console */
// Eleven graph-query subcommands — JSON-by-default for agent
// consumption, plain-text fallback when stdout is a TTY. Errors go to
// stderr; exit code 2 on fatal, 1 on warnings, 0 on success.

import { Command } from "commander";
import {
  ExitError,
  affectedTests,
  blastRadius,
  findNodesByLayer,
  findPath,
  findWriters,
  getNeighbors,
  loadGraph,
  queryNode,
  similarNodes,
  topoOrder,
  verifyEdge,
  type LoadOptions,
  type ToolResult,
} from "../lib/graph.js";

interface GlobalFlags {
  session?: string;
  graph?: string;
  web?: string;
  json?: boolean;
}

function loadOpts(o: GlobalFlags): LoadOptions {
  return { session: o.session, graphFile: o.graph, web: o.web };
}

/** Pretty print or JSON-emit, then exit with the right code. */
function emit<T>(result: ToolResult<T>, opts: { json?: boolean }): never {
  const wantsJson = opts.json || !process.stdout.isTTY;
  if (wantsJson) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    process.stdout.write(result.summary + "\n");
    if (result.data) {
      process.stdout.write(JSON.stringify(result.data, null, 2) + "\n");
    }
  }
  process.exit(result.ok ? 0 : 1);
}

function fail(msg: string, code = 2): never {
  process.stderr.write(`✖ ${msg}\n`);
  process.exit(code);
}

async function run<T>(
  fn: () => Promise<ToolResult<T>>,
  opts: { json?: boolean },
): Promise<never> {
  try {
    const result = await fn();
    emit(result, opts);
  } catch (e) {
    if (e instanceof ExitError) fail(e.message, e.code);
    fail(e instanceof Error ? e.message : String(e));
  }
}

/** Add the eleven query subcommands to the root program. */
export function registerQueryCommands(program: Command): void {
  const addGlobal = <T extends Command>(cmd: T): T =>
    cmd
      .option("-s, --session <id>", "session id (defaults to ~/.causalist/session.json)")
      .option("-g, --graph <path>", "load a local graph JSON file instead")
      .option("--web <url>", "Causalist web base URL", "https://causalist.xyz")
      .option("--json", "emit JSON to stdout (default when piped)") as T;

  addGlobal(
    program
      .command("node <id>")
      .description("Get a node's metadata, layer, and summary"),
  ).action(async (id: string, opts: GlobalFlags) => {
    await run(async () => queryNode((await loadGraph(loadOpts(opts))).graph, id), opts);
  });

  addGlobal(
    program
      .command("neighbors <id>")
      .description("List incoming / outgoing neighbors with edge kinds")
      .option("-d, --direction <dir>", "in | out | both", "both"),
  ).action(async (id: string, opts: GlobalFlags & { direction?: string }) => {
    const dir = (opts.direction ?? "both") as "in" | "out" | "both";
    await run(
      async () => getNeighbors((await loadGraph(loadOpts(opts))).graph, id, dir),
      opts,
    );
  });

  addGlobal(
    program
      .command("path <source> <target>")
      .description("Shortest causal path between two nodes")
      .option("-m, --max-hops <n>", "maximum path length", "6"),
  ).action(
    async (
      source: string,
      target: string,
      opts: GlobalFlags & { maxHops?: string },
    ) => {
      await run(
        async () =>
          findPath(
            (await loadGraph(loadOpts(opts))).graph,
            source,
            target,
            Number(opts.maxHops) || 6,
          ),
        opts,
      );
    },
  );

  addGlobal(
    program
      .command("layer <name>")
      .description("List nodes in a semantic layer (api/data/logic/ui/test/config/infra)")
      .option("-l, --limit <n>", "max results", "50"),
  ).action(async (name: string, opts: GlobalFlags & { limit?: string }) => {
    await run(
      async () =>
        findNodesByLayer(
          (await loadGraph(loadOpts(opts))).graph,
          name,
          Number(opts.limit) || 50,
        ),
      opts,
    );
  });

  addGlobal(
    program
      .command("blast <id>")
      .description("Reverse-reachable set — what depends on this node")
      .option("-d, --depth <n>", "max BFS depth", "3")
      .option("--via <kinds>", "comma-separated edge kinds to traverse"),
  ).action(
    async (
      id: string,
      opts: GlobalFlags & { depth?: string; via?: string },
    ) => {
      const via = opts.via?.split(",").map((s) => s.trim()).filter(Boolean);
      await run(
        async () =>
          blastRadius(
            (await loadGraph(loadOpts(opts))).graph,
            id,
            Number(opts.depth) || 3,
            via,
          ),
        opts,
      );
    },
  );

  addGlobal(
    program
      .command("tests <ids...>")
      .description("Tests reachable from a set of changed node ids — '3 tests not 300'")
      .option("-m, --max-hops <n>", "BFS depth", "4"),
  ).action(
    async (ids: string[], opts: GlobalFlags & { maxHops?: string }) => {
      await run(
        async () =>
          affectedTests(
            (await loadGraph(loadOpts(opts))).graph,
            ids,
            Number(opts.maxHops) || 4,
          ),
        opts,
      );
    },
  );

  addGlobal(
    program
      .command("writers <target>")
      .description("Find every node that writes to a target (security audit)"),
  ).action(async (target: string, opts: GlobalFlags) => {
    await run(
      async () => findWriters((await loadGraph(loadOpts(opts))).graph, target),
      opts,
    );
  });

  addGlobal(
    program
      .command("similar <id>")
      .description("Find structurally similar nodes (same layer / kind / degree)")
      .option("-l, --limit <n>", "max results", "5"),
  ).action(async (id: string, opts: GlobalFlags & { limit?: string }) => {
    await run(
      async () =>
        similarNodes(
          (await loadGraph(loadOpts(opts))).graph,
          id,
          Number(opts.limit) || 5,
        ),
      opts,
    );
  });

  addGlobal(
    program
      .command("topo <ids...>")
      .description("Topological layering of a subgraph — turns 'build X' into a layered plan"),
  ).action(async (ids: string[], opts: GlobalFlags) => {
    await run(
      async () => topoOrder((await loadGraph(loadOpts(opts))).graph, ids),
      opts,
    );
  });

  addGlobal(
    program
      .command("verify <source> <target>")
      .description("Confirm an edge exists between two nodes")
      .option("-k, --kind <k>", "filter by edge kind (imports/calls/reads/writes/extends)"),
  ).action(
    async (
      source: string,
      target: string,
      opts: GlobalFlags & { kind?: string },
    ) => {
      await run(
        async () =>
          verifyEdge(
            (await loadGraph(loadOpts(opts))).graph,
            source,
            target,
            opts.kind,
          ),
        opts,
      );
    },
  );
}

/**
 * `causalist help --json` — emits a capabilities manifest the SKILL.md
 * file's preamble can read to resolve the active session and confirm
 * the binary is on PATH.
 */
export function registerHelpCommand(program: Command): void {
  program
    .command("info")
    .description("Print capabilities + active session as JSON")
    .option("--json", "emit JSON to stdout (default when piped)")
    .option("-s, --session <id>", "session id")
    .option("-g, --graph <path>", "local graph JSON file")
    .option("--web <url>", "Causalist web base URL", "https://causalist.xyz")
    .action(async (opts: GlobalFlags) => {
      let session: string | null = null;
      let repo: string | undefined = undefined;
      try {
        const src = await loadGraph(loadOpts(opts));
        repo = src.graph.repo;
        session =
          src.origin.kind === "session" ? src.origin.ref : `local:${src.origin.ref}`;
      } catch {
        // ignore — info should always print, even with no session
      }
      const manifest = {
        version: "0.2.0",
        session,
        repo,
        web: (opts.web ?? "https://causalist.xyz").replace(/\/$/, ""),
        commands: [
          { name: "node", args: ["<id>"] },
          { name: "neighbors", args: ["<id>"], flags: ["--direction"] },
          { name: "path", args: ["<source>", "<target>"], flags: ["--max-hops"] },
          { name: "layer", args: ["<name>"], flags: ["--limit"] },
          { name: "blast", args: ["<id>"], flags: ["--depth", "--via"] },
          { name: "tests", args: ["<ids...>"], flags: ["--max-hops"] },
          { name: "writers", args: ["<target>"] },
          { name: "similar", args: ["<id>"], flags: ["--limit"] },
          { name: "topo", args: ["<ids...>"] },
          { name: "verify", args: ["<source>", "<target>"], flags: ["--kind"] },
        ],
        outputContract: {
          shape: "{ ok: boolean, summary: string, data?: any }",
          jsonByDefault: "when stdout is piped or --json is set",
          exitCodes: { 0: "ok", 1: "ok=false (warning)", 2: "fatal — see stderr" },
        },
      };
      const wantsJson = opts.json || !process.stdout.isTTY;
      if (wantsJson) {
        process.stdout.write(JSON.stringify(manifest) + "\n");
      } else {
        process.stdout.write(`causalist v${manifest.version}\n`);
        process.stdout.write(`session: ${session ?? "(none — run \`causalist pair <code>\`)"}\n`);
        process.stdout.write(`repo:    ${repo ?? "—"}\n`);
        process.stdout.write(`web:     ${manifest.web}\n`);
        process.stdout.write(`\ncommands: ${manifest.commands.map((c) => c.name).join(", ")}\n`);
      }
      process.exit(0);
    });
}
