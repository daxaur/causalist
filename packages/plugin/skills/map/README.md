# /causalist:map

Generates a 3D causal graph for any GitHub repository using the Causalist CLI.

## Quick start

```bash
# After installing the plugin
/causalist:map vercel/next.js
```

Claude Code will call the local `causalist` binary, wait for the four Claude
agents to finish (typically 30–90s for medium repos), and open the rendered
graph at `https://causalist.dev/<owner>/<repo>` in your browser.

## Arguments

- **url-or-slug** (required): a full GitHub URL (`https://github.com/owner/repo`)
  or a shorthand slug (`owner/repo`).

## Related skills

Nothing yet — `query` (ask the Oracle about a rendered graph) ships in the next
release.
