# Deploy Causalist

## One-click (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdaxaur%2Fcausalist&project-name=causalist&repository-name=causalist&env=NEXT_PUBLIC_APP_URL&envDescription=Base%20URL%20of%20your%20deployed%20app.%20Used%20for%20OAuth%20callback%20URLs.&envLink=https%3A%2F%2Fgithub.com%2Fdaxaur%2Fcausalist%2Fblob%2Fmain%2F.env.example)

Clicking the button:
1. Forks or imports the repo into your Vercel account
2. Walks you through env var configuration (see below)
3. Builds and deploys

## Environment variables

| Variable                 | Required | What it is                                                        |
|--------------------------|----------|-------------------------------------------------------------------|
| `NEXT_PUBLIC_APP_URL`    | **Yes**  | Base URL of your deployment, e.g. `https://causalist.dev`         |
| `GITHUB_CLIENT_ID`       | No       | GitHub OAuth — without it the app falls back to the PAT flow       |
| `GITHUB_CLIENT_SECRET`   | No       | Paired with `GITHUB_CLIENT_ID`                                    |
| `UPSTASH_REDIS_REST_URL` | No       | Needed for multi-instance live streaming (phase 2)                |
| `UPSTASH_REDIS_REST_TOKEN`| No      | Paired with the above                                             |

## GitHub OAuth setup (optional but recommended for prod)

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name:** Causalist
   - **Homepage URL:** your deployed URL (e.g. `https://causalist.dev`)
   - **Authorization callback URL:** `<your-url>/api/auth/github/callback`
3. Click **Register application**
4. Click **Generate a new client secret** — copy it immediately
5. Add both values to Vercel → Settings → Environment Variables
6. Redeploy

## CLI install (users)

Once Causalist is deployed, users can install the CLI:

```bash
npm install -g causalist
causalist install        # writes a Claude Code plugin
causalist map vercel/next.js --open
```

The CLI opens `<YOUR_DEPLOY>/<owner>/<repo>` in the user's browser. If you
deploy to a custom domain, set `--web <url>` or publish to npm with the
domain hardcoded.

## Plugin marketplace submission

The Claude Code plugin lives in `packages/plugin/`. Submit it to the
official marketplace at <https://claude.ai/settings/plugins/submit>.
