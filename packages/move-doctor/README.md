# Move Doctor

> Your agent writes bad Move, this catches it.

Deterministic Sui Move scanner. Rules grounded in [The Move Book](https://move-book.com/guides/code-quality-checklist/), the Sui compiler's `--lint` pass, and documented Sui Move best practices. Outputs a 0–100 health score with file/line refs and fix recipes.

## Quick start

```bash
npx move-doctor@latest
```

Scans the current directory. Sample output:

```
move-doctor: my_package (edition: 2024.beta)

Score: 84 / 100
Findings: 8 (errors: 0, warnings: 1, info: 7)

INFO  conventions/event-not-past-tense  (Move Book §11)
         sources/registry.move:42:5
         Event type "RegisterUser" looks present-tense …
         fix: Rename to a past-tense form (e.g. "UserRegistered").
…
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

## Flags

| Flag              | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `<directory>`     | Path to scan (default: `.`)                              |
| `--verbose`       | Show file/line refs and fix hints per finding            |
| `--diff[=base]`   | Only scan files changed vs `HEAD` (or vs `<base>`)       |
| `--score`         | Output only the numeric score (CI gate)                  |
| `--json`          | Emit machine-readable output                             |
| `--no-tests`      | Skip `*_tests.move` and `tests/`                         |
| `install`         | Install the SKILL.md into the current directory's agents |
| `-h`, `--help`    | Show CLI help                                            |
| `-v`, `--version` | Show version                                             |

## What it catches

Covers every applicable section of [The Move Book Code Quality Checklist](https://move-book.com/guides/code-quality-checklist/) (§1–§40), plus targeted ability and security best-practice rules.

| Bucket | Covers |
|--|--|
| `conventions` | Move Book §1–§12, §32, §40 + error-code / dead-const hygiene |
| `functions` | Move Book §13–§17 + recursion check |
| `idioms` | Move Book §18–§25 |
| `macros` | Move Book §26–§31 |
| `testing` | Move Book §33–§39 |
| `abilities` | Sui Move ability safety |
| `security` | Sui Move security best practice |
| `(compiler)` | Sui `--lint` pass-through (W00001 / W01001 / W02001 / W03001 / W04001 / W05001) — when `sui` is on PATH |

Full catalog with per-rule playbooks: [move.doctor/docs/rules](https://move.doctor/docs/rules)

## Score model

Start at 100. Each finding deducts a per-severity weight:

- `error` &nbsp; -8
- `warning` -3
- `info` &nbsp; &nbsp; &nbsp; -1

Capped at -25 per rule so a single noisy rule can't tank the score. Floor at 0.

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
