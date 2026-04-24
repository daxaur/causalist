# Causalist — hand-off setup

Two things the agent can't do from the sandbox. Run them yourself.

---

## 1. Publish the CLI to npm

MCP is already live (`causalist-mcp@0.1.0`). The CLI isn't.

```bash
cd /Users/daxasaurus/cartograph/packages/cli
npm publish --access public
```

npm will pop a browser tab for 2FA. Confirm in the browser, terminal finishes.

Verify:

```bash
npm view causalist version                    # expect 0.1.0
npx -y causalist@latest --help                # prints command list
```

---

## 2. Enable Supabase on production

Swap `/s/<id>` share links from 500-on-prod to actually working, and make pair codes survive cross-lambda on Vercel.

```bash
# URL (non-sensitive)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# paste when prompted: https://xzpzbykunvnyhuyfrhgu.supabase.co

# Service-role key (sensitive — copy from Supabase dashboard)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Get it here:
#   https://supabase.com/dashboard/project/xzpzbykunvnyhuyfrhgu/settings/api-keys
# The one labeled "service_role · secret". Copy value, paste when prompted.

# Re-deploy to pick up the new env
vercel --prod --yes
```

Smoke-test after deploy:

```bash
# Expect 404 (unknown share), not 500
curl -sS -o /dev/null -w "%{http_code}\n" https://causalist.xyz/s/nonexistent

# In the app, ⌘K inside any preview → "Share graph (public link)"
# You should get a toast with a /s/<id> URL that opens in a new tab.
```

---

## 3. (Optional) Add Preview + Development envs

Same 2 vars for the Preview environment if you want preview deploys to share database:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
```

---

## 4. Verify Claude Agent SDK migration

The pipeline in `src/lib/analyze/pipeline.ts` now uses the real
`@anthropic-ai/claude-agent-sdk` instead of raw `messages.create`.
That SDK spawns the Claude Code CLI as a subprocess per call, which:

- retries 429/5xx automatically
- returns `total_cost_usd` and `usage` per call
- auto-compacts context if we overflow 1M
- supports `interrupt()` to cancel mid-stream

After you deploy, analyze any small repo. If the agent rail streams
"●" bullets and ends with "All done" + an edge count >0, the migration
is live and working.

If the pipeline fails immediately with a subprocess error, the Vercel
function probably can't find the platform binary
(`@anthropic-ai/claude-agent-sdk-linux-x64` — optional dep). In that
case, `vercel` dashboard → project → settings → general → Node runtime
must be 20+ (currently `"engines": {"node": ">=20"}` in the CLI
package; the web app is Next 16 which defaults to Node 20). No action
needed if you're on 20+.
