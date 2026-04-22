# causalist (CLI)

Paste a GitHub URL, get a 3D causal graph. Universal shell interface — works
with Claude Code, Cursor, Hermes, Aider, or any agent that can run a command.

```bash
npm install -g causalist

export ANTHROPIC_API_KEY=sk-ant-...
causalist map vercel/next.js --open
```

## Commands

| Command                                | What it does                                       |
|----------------------------------------|----------------------------------------------------|
| `causalist map <url-or-slug>`          | Analyze a repo and print the graph JSON            |
| `causalist map <repo> --open`          | Open the graph in the Causalist web UI            |
| `causalist map <repo> -o graph.json`   | Write the graph to a file                          |
| `causalist install`                    | Install as a Claude Code plugin                    |
| `causalist serve`                      | (Phase 3) Run a local web UI                       |

## Environment

| Variable              | Required? | Purpose                                |
|-----------------------|-----------|----------------------------------------|
| `ANTHROPIC_API_KEY`   | Yes       | Powers the four analyze agents         |
| `GITHUB_TOKEN`        | Private   | Optional — needed for private repos    |

## License

MIT. Claude and Anthropic are trademarks of Anthropic PBC.
