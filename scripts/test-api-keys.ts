// One-shot unit test for the api-keys store.
// Exercises mint → lookup → list → revoke against the in-memory path.

import {
  KEY_PREFIX,
  listKeys,
  lookupKey,
  mintKey,
  requireApiKey,
  revokeKey,
} from "../src/lib/auth/api-keys";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error("✖", msg);
    process.exit(1);
  }
  console.log("✓", msg);
}

async function main() {
  const owner = { userId: 1234567, userLogin: "daxaur" };

  // Mint
  const { token, record } = await mintKey(owner, "claude-code-laptop");
  assert(token.startsWith(KEY_PREFIX), `token has prefix: ${token.slice(0, 12)}…`);
  assert(record.userLogin === "daxaur", "record carries the login");
  assert(record.name === "claude-code-laptop", "record carries the name");
  assert(record.keyPrefix.startsWith(KEY_PREFIX), "record exposes prefix");
  assert(record.keyPrefix.length === KEY_PREFIX.length + 6, "prefix is 6 random chars past the prefix");

  // Lookup by token (the Bearer path)
  const found = await lookupKey(token);
  assert(found?.id === record.id, "lookupKey resolves to the same record");
  assert(found?.userId === owner.userId, "lookupKey carries userId");

  // requireApiKey wrapper — simulate a Request with the Bearer header
  const req = new Request("http://example/api/projects", {
    headers: { authorization: `Bearer ${token}` },
  });
  const resolved = await requireApiKey(req);
  assert(resolved?.id === record.id, "requireApiKey reads Bearer header");

  // Bad token
  const reqBad = new Request("http://example/api/projects", {
    headers: { authorization: "Bearer cspl_live_garbage_token" },
  });
  const resolvedBad = await requireApiKey(reqBad);
  assert(resolvedBad === null, "requireApiKey returns null for unknown token");

  // Missing prefix
  const reqWrongFormat = new Request("http://example/api/projects", {
    headers: { authorization: "Bearer not-our-format" },
  });
  assert(
    (await requireApiKey(reqWrongFormat)) === null,
    "requireApiKey rejects non-cspl tokens",
  );

  // Mint a second key for the same user, plus one for a DIFFERENT user
  const { record: key2 } = await mintKey(owner, "github-action");
  const { token: otherToken } = await mintKey(
    { userId: 999, userLogin: "someone-else" },
    "their key",
  );

  // List — only this user's keys, sorted newest first
  const list = await listKeys(owner);
  assert(list.length === 2, `list returns 2 keys for owner (got ${list.length})`);
  assert(list[0].id === key2.id, "newest key is first");
  assert(
    list.every((k) => k.userId === owner.userId),
    "list scopes to user_id (no cross-user leakage)",
  );

  // Revoke key 1, lookup must miss
  const revoked = await revokeKey(owner, record.id);
  assert(revoked, "revokeKey returns true for owned key");
  const afterRevoke = await lookupKey(token);
  assert(afterRevoke === null, "revoked key no longer resolves via Bearer");

  // Revoking someone else's key as us must fail
  const otherLookup = await lookupKey(otherToken);
  assert(otherLookup !== null, "other user's key still resolves");
  const cantRevokeForeign = await revokeKey(owner, otherLookup!.id);
  assert(!cantRevokeForeign, "cannot revoke another user's key");

  // Final list state
  const list2 = await listKeys(owner);
  assert(list2.length === 1, "after revoke, owner has 1 key left");
  assert(list2[0].id === key2.id, "remaining key is the unrevoked one");

  console.log("\nAll api-keys store assertions passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
