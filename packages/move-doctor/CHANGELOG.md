# Changelog

## 0.2.0

### Minor Changes

- [`b750e20`](https://github.com/notmatical/move-doctor/commit/b750e206ac81077dd751e1b71096becad88b9750) Thanks [@notmatical](https://github.com/notmatical)! - Citations now link to their exact source. Every rule carries a `citationUrl` pointing at the precise Move Book code-quality-checklist anchor (e.g. `#capabilities-go-second`) or concept page, and citation labels use descriptive headings ("Move Book: Capabilities Go Second") instead of opaque section numbers. The URL flows through to `--json` diagnostics, the website rule pages, and the generated rule playbooks.

### Patch Changes

- [#1](https://github.com/notmatical/move-doctor/pull/1) [`e133e5e`](https://github.com/notmatical/move-doctor/commit/e133e5e12856a77cbafaf71575c5f0f981f5ad44) Thanks [@notmatical](https://github.com/notmatical)! - Refresh package branding: new tagline "A deterministic linter for Sui Move", a clearer npm `description`, tidied `keywords` (dropped the inaccurate `audit` tag), and a README with up-to-date sample output and source-linked rule buckets.

All notable changes to the `move-doctor` package will be documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **AST rules via tree-sitter.** move-doctor now parses Move with [MystenLabs' tree-sitter grammar](https://github.com/MystenLabs/sui/tree/main/external-crates/move/tooling/tree-sitter), loaded in-process from a committed WebAssembly build (`web-tree-sitter`). New `defineAstRule` API; the engine parses each file once and shares the tree across AST rules. A missing/broken grammar degrades gracefully — regex rules are unaffected. See [docs/authoring-rules.md](../../docs/authoring-rules.md). The grammar wasm is committed; `bun run grammar:build` refreshes it (no Docker/Emscripten).
- **Setup wizard: agent hooks + additional-setup step.** After picking agents, the wizard offers a multiselect (Agent hooks · GitHub Actions workflow). Agent hooks install a post-edit scan hook for Claude Code (`PostToolBatch`) and Cursor (`postToolUse`).
- **4 audit-informed rules** (patterns recurring across published Sui audits): `conventions/duplicate-error-code` (error constants sharing an abort code), `conventions/unused-const` (dead module constants), `security/mut-uid-accessor-leak` (`public fun` returning `&mut UID`), and `functions/recursive-function-call` (direct self-recursion — a recurring always-aborts footgun).

### Changed

- **Migrated all structural rules to the AST** — they now match Move's parse tree (via tree-sitter) instead of regex: abilities, struct/const naming, function signatures, call/macro idioms, loop macros, capability rules, and test-attribute rules. This eliminates comment/string false-matches and handles multi-line / postfix forms robustly; detection semantics are preserved (the regression suite locks identical scores). The layout/comment/import-line rules and the `Move.toml` manifest rules deliberately stay on regex — the AST can't express them.

## [0.1.0] — initial release

### Added

- Deterministic Sui Move scanner with a 0–100 health score.
- Rules across 7 buckets (`conventions`, `functions`, `idioms`, `macros`, `testing`, `abilities`, `security`), each citing its source — [The Move Book Code Quality Checklist](https://move-book.com/guides/code-quality-checklist/), the Sui compiler's `--lint` pass, or documented Sui Move best practices.
- **Pass-through of Sui compiler `--lint`** when the `sui` CLI is on PATH (W00001 share_owned, W01001 self_transfer, W02001 custom_state_change, W03001 coin_field, W04001 freeze_wrapped, W05001 collection_equality).
- CLI flags: `--verbose`, `--diff[=base]`, `--score`, `--json`, `--no-tests`.
- `move-doctor install` command — writes the agent SKILL.md to `<cwd>/.claude/skills/move-doctor/SKILL.md`.
- Bundled single-file distribution via tsup. No runtime dependencies, ~60 kB tarball.
- Friendly error messages for: missing `Move.toml`, malformed `Move.toml`, `--diff` outside a git repo, `--diff` against a non-existent revision, empty project (no `.move` files).
- Per-rule hosted playbooks at `https://move.doctor/prompts/rules/<bucket>/<rule>.md` for agent fetch.
- Canonical agent playbook at `https://move.doctor/prompts/move-doctor-agent.md`.

### Score model

- Start at 100, deduct per-severity weight per finding: `error` -8, `warning` -3, `info` -1.
- Per-rule cap: -25 (a single noisy rule cannot tank the score).
- Floor: 0.

### Known limits (deferred to v0.2+)

- Text/regex scanning only — no AST. Rules requiring scope or type information (e.g. reference-vs-value assignment, type-parameter-vs-config-index mismatch) are deferred until move-doctor wraps `sui-move-analyzer` or a tree-sitter grammar.
- `cap-struct-missing-suffix` flags any `key` struct whose only field is `id: UID` as a potential capability; can false-positive on asset-shaped game items (e.g. an NFT with a single `id` field). Distinguishing a capability from a minimal asset needs type/ownership info, so it's bound to the no-AST limit above. Severity is `info` so the score impact is minimal; add a `Cap` suffix or a non-`id` field to silence.
- Aptos Move and Movement Move support not included.
