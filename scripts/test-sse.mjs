// Subscribe to /api/stream/user-99999, fire a project-create through
// the Bearer endpoint, and verify the project_added event arrives on
// the SSE channel.

const BASE = "http://localhost:3142";
const USER_ID = 99999;

async function main() {
  // 1) Mint a Bearer key via the debug route.
  const mint = await fetch(`${BASE}/api/debug/mint-test-key`, {
    method: "POST",
  });
  const { token } = await mint.json();
  console.log("✓ minted key:", token.slice(0, 18) + "…");

  // 2) Open the SSE stream and start collecting events.
  const ac = new AbortController();
  const sseRes = await fetch(`${BASE}/api/stream/user-${USER_ID}`, {
    signal: ac.signal,
    headers: { accept: "text/event-stream" },
  });
  if (!sseRes.body) throw new Error("no SSE body");
  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();

  let received = "";
  let projectEvent = null;

  // Read in the background; resolves once we get a project_added or 5s pass.
  const readPromise = (async () => {
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const { value, done } = await reader.read();
      if (done) break;
      received += decoder.decode(value, { stream: true });
      const blocks = received.split("\n\n");
      for (const b of blocks) {
        if (b.includes("event: project_added")) {
          const dataLine = b.split("\n").find((l) => l.startsWith("data:"));
          if (dataLine) {
            projectEvent = JSON.parse(dataLine.slice(5).trim());
            return;
          }
        }
      }
    }
  })();

  // Give the SSE reader 250ms to subscribe before publishing.
  await new Promise((r) => setTimeout(r, 250));

  // 3) Publish a project via the Bearer route.
  const publish = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      githubUrl: "https://github.com/sveltejs/svelte",
      nickname: "svelte-via-sse",
    }),
  });
  const pubBody = await publish.json();
  console.log("✓ publish status:", publish.status, pubBody.viewerUrl);

  // 4) Wait for the SSE event to land.
  await readPromise;
  ac.abort();

  if (!projectEvent) {
    console.error("✖ no project_added event received within 5s");
    process.exit(1);
  }
  console.log("✓ SSE project_added event received:");
  console.log("   ", JSON.stringify(projectEvent.project));

  // Sanity assertions
  if (projectEvent.project?.owner !== "sveltejs") {
    console.error("✖ wrong owner");
    process.exit(1);
  }
  if (projectEvent.project?.repo !== "svelte") {
    console.error("✖ wrong repo");
    process.exit(1);
  }
  if (projectEvent.project?.nickname !== "svelte-via-sse") {
    console.error("✖ nickname dropped");
    process.exit(1);
  }
  console.log("\nAll SSE round-trip assertions passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
