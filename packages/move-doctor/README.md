# Move Doctor

> A deterministic linter for Sui Move.

Deterministic Sui Move scanner. Rules grounded in [The Move Book](https://move-book.com/guides/code-quality-checklist/), the Sui compiler's `--lint` pass, and documented Sui Move best practices. Outputs a 0–100 health score with file/line refs and fix recipes.

## Quick start

```bash
npx move-doctor@latest
```

Scans the current directory and prints a health score, a per-bucket breakdown, and next steps. Add `--verbose` for file/line refs and fix hints. Sample output:

```
  ╭────────────────────────────────────────────────────────────────────────╮
  │                                                                        │
  │ 44 / 100   poor                                          movebook_gaps │
  │ ███████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
  │                                                                        │
  │ 2 modules · edition 2024.beta · Sui 1.70.2 · scanned in 1.3s           │
  │ 22 findings  >  4 errors · 3 warnings · 15 info                        │
  ╰────────────────────────────────────────────────────────── move.doctor ─╯

  security     >  4 errors · 3 warnings
  conventions  >  5 info
  testing      >  5 info
  functions    >  2 info
  idioms       >  2 info
  macros       >  1 info

  > Run --verbose for file refs and fix hints.
  > Full rule catalog: https://move.doctor/docs/rules
```

## Install as an agent skill

```bash
npx move-doctor@latest install
```

Writes `<cwd>/.claude/skills/move-doctor/SKILL.md`. Claude Code picks it up automatically — type `/movedoctor` or ask it to "run move doctor" and it'll scan, group findings, and fix them.

## CI gate

Use `--score` for a numeric output and gate PRs on a budget:

```bash
SCORE=$(npx move-doctor@latest . --score)
[ "$SCORE" -ge 80 ] || exit 1
```

## Requirements

- Node.js ≥ 20
- (Optional) Sui CLI on PATH — when present, `sui move build --lint` runs in parallel and its 6 built-in lints feed the same score.

## Source

- Source code: [github.com/notmatical/move-doctor](https://github.com/notmatical/move-doctor)
- Issues: [github.com/notmatical/move-doctor/issues](https://github.com/notmatical/move-doctor/issues)
- Per-rule playbooks: [move.doctor/docs/rules](https://move.doctor/docs/rules)
- Agent prompt: [move.doctor/prompts/move-doctor-agent.md](https://move.doctor/prompts/move-doctor-agent.md)

## License

MIT
