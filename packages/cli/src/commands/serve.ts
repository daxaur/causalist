/* eslint-disable no-console */
import kleur from "kleur";

interface ServeOpts {
  port: string;
}

export async function serve(opts: ServeOpts): Promise<void> {
  console.log(
    `${kleur.bold("▸")} ${kleur.yellow("causalist serve")} is not yet implemented.`,
  );
  console.log("");
  console.log("  In the interim, run the Next.js dev server from the repo:");
  console.log(`    ${kleur.cyan("$")} git clone https://github.com/daxaur/causalist.git`);
  console.log(`    ${kleur.cyan("$")} cd causalist`);
  console.log(`    ${kleur.cyan("$")} npm install && npm run dev -- --port ${opts.port}`);
  console.log("");
  process.exit(1);
}
