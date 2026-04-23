/* eslint-disable no-console */
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import kleur from "kleur";

interface PairOpts {
  web?: string;
}

export async function pair(code: string, opts: PairOpts): Promise<void> {
  const web = (opts.web ?? "https://causalist.xyz").replace(/\/$/, "");
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    throw new Error(
      `Invalid pair code "${code}" — expected 6 characters A–Z 0–9.`,
    );
  }

  const url = `${web}/api/pair?code=${normalized}`;
  console.log(`${kleur.dim("→")} Claiming pair code at ${kleur.cyan(web)}`);

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 410)
      throw new Error(
        `Code has expired or was already claimed. Generate a new one at ${web}/pair`,
      );
    const body = await res.text().catch(() => "");
    throw new Error(`Pair failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { sessionId: string; token: string };
  const sessionFile = resolve(homedir(), ".causalist", "session.json");
  await mkdir(resolve(homedir(), ".causalist"), { recursive: true });
  await writeFile(
    sessionFile,
    JSON.stringify(
      {
        sessionId: data.sessionId,
        token: data.token,
        paired: web,
        claimedAt: Date.now(),
      },
      null,
      2,
    ),
  );

  console.log(kleur.green(`✓ Paired with ${web}`));
  console.log("");
  console.log(`  ${kleur.dim("session:")} ${data.sessionId}`);
  console.log(`  ${kleur.dim("saved to:")} ${sessionFile}`);
  console.log("");
  console.log(`  Run ${kleur.bold("causalist map <repo>")} to start streaming,`);
  console.log(`  or launch Claude Code — its hooks will auto-publish to this session.`);
  console.log("");
  console.log(
    `  ${kleur.dim("shell vars:")}  export CAUSALIST_SESSION=${data.sessionId}`,
  );
  console.log(
    `               export CAUSALIST_TOKEN=${data.token.slice(0, 6)}…`,
  );
}
