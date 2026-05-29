# Move Doctor

[![version](https://img.shields.io/npm/v/move-doctor?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/move-doctor)
[![downloads](https://img.shields.io/npm/dt/move-doctor.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/move-doctor)

**Your agent writes bad Move, this catches it.**

Move Doctor scans a Sui Move codebase and reports issues across conventions, idioms, abilities, testing, and security — with a 0–100 health score. It's deterministic and runs anywhere `npx` does. Every rule cites its source: [The Move Book](https://move-book.com/guides/code-quality-checklist/) code-quality checklist, the Sui compiler's `--lint` pass, and Sui Move security best practices. Structural rules run on [MystenLabs' tree-sitter Move grammar](https://github.com/MystenLabs/sui/tree/main/external-crates/move/tooling/tree-sitter); the rest are fast text checks.

## Quick start

```bash
npx move-doctor@latest
```

Scans the current directory and prints the score + findings. Add `--verbose` for file/line refs and fix hints, `--diff` to scan only changed files, or `--score` for just the number. Run `move-doctor --help` for the full list of flags.

## Install for your agent

```bash
npx move-doctor@latest install
```

Interactive setup that installs the `/move-doctor` skill for your coding agents (Claude Code, Cursor, Codex, OpenCode, …) — teaching them to run move-doctor and fix what it finds — and optionally adds:

- **Agent hooks** — Claude Code / Cursor re-scan changed files automatically after each edit.
- **GitHub Actions workflow** — score every PR in CI.

## Run in CI

Gate PRs on the score:

```bash
npx move-doctor@latest . --score   # prints just the number, e.g. 87
```

Fail the build below a budget (`score < 80`), or let `move-doctor install` drop in a ready-made `.github/workflows/move-doctor.yml`.

## Contributing

Issues and new rules welcome — the only bar is that every rule cites a canonical source. Most rules are AST-based (tree-sitter); layout, comment, and `Move.toml` checks stay regex, and adding one is a single file. See [`CONTRIBUTING.md`](./CONTRIBUTING.md), the [rule-writing guide](./docs/authoring-rules.md), and the [full rule list](https://move.doctor/docs/rules).

## License

MIT
