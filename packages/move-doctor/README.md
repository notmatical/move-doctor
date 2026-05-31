# Move Doctor

> A deterministic linter for Sui Move.

Deterministic Sui Move scanner. Rules grounded in [The Move Book](https://move-book.com/guides/code-quality-checklist/), the Sui compiler's `--lint` pass, and documented Sui Move best practices. Outputs a 0–100 health score with file/line refs and fix recipes.

## Quick start

```bash
npx move-doctor@latest
```

Scans the current directory and prints a 0–100 health score, a severity breakdown by area, and next steps. Add `--verbose` for file/line refs and fix hints. With the Sui CLI on `PATH`, its `sui move build --lint` pass runs alongside and feeds the same score.

## Install as an agent skill

```bash
npx move-doctor@latest install
```

Writes `<cwd>/.claude/skills/move-doctor/SKILL.md`. Claude Code picks it up automatically — type `/movedoctor` or ask it to "run move doctor" and it'll scan, group findings, and fix them.

## CI

`npx move-doctor@latest install` can set up a GitHub Actions workflow that scores every push and pull request. To gate by hand, fail the build below a score budget:

```bash
SCORE=$(npx move-doctor@latest . --score)
[ "$SCORE" -ge 80 ] || exit 1
```

## Source

- Source code: [github.com/notmatical/move-doctor](https://github.com/notmatical/move-doctor)
- Issues: [github.com/notmatical/move-doctor/issues](https://github.com/notmatical/move-doctor/issues)
- Agent prompt: [move.doctor/prompts/move-doctor-agent.md](https://move.doctor/prompts/move-doctor-agent.md)

## License

MIT
