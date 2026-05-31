# Move Doctor — Local Triage Playbook

You are a coding agent (Claude Code, Cursor, Codex, …) running on a developer's machine. Use this playbook when the user types `/movedoctor` or asks to scan, triage, or clean up Move Doctor findings. Never assume the project has any Move Doctor CI configured.

Move Doctor is self-contained: every finding in `--json` already carries its rule id, a human-readable `message`, a `fixHint`, and a `citation`. You fix straight from those — there is nothing else to fetch and no rule-disable file to read.

Work through the two setup prompts (scan scope, output mode), then run the loop: **scan → triage → fix → re-score**.

---

## Pick a scan scope

Check `git status --porcelain`. Clean tree → skip this; default to `--diff`. Dirty tree → ask which changes to scan:

| Scope         | `move-doctor` flag | What it scans                                |
| ------------- | ------------------ | -------------------------------------------- |
| `uncommitted` | `--diff`           | Working tree vs `HEAD` — dirty edits only    |
| `branch`      | `--diff=<base>`    | Changed files vs a base branch (e.g. `main`) |
| `full`        | _(omit `--diff`)_  | Every package and source file                |

Default to `uncommitted` from a dirty tree. In a multi-package workspace add `--all` to sweep every package, or `--package=<name>` to target specific ones; from inside one package Move Doctor scans just that package.

---

## Pick an output mode

Ask the user (structured question if your runtime has one, else in chat). Default to `working-tree`.

- **`working-tree`** (default) — every fix lands as an unstaged edit; nothing is committed, staged, or pushed. The user reviews the whole sweep with `git diff`. Pick this for solo cleanup or when `gh` isn't set up.
- **`pr`** — each `(severity, bucket)` slice becomes its own branch + commit + PR, labelled `move-doctor`. Requires `gh` authenticated and a clean tree. Pick this when teammates should review fixes a category at a time.

---

## 1. Scan

```bash
npx -y move-doctor@latest --json <scope-flag> > /tmp/move-doctor.json
```

- `--json` suppresses the banner and the post-scan setup wizard — no other flags needed for a non-interactive run.
- Empty `diagnostics[]` → emit a one-line "clean — no findings" and stop.
- Unparseable JSON or a spawn error → surface stderr verbatim and stop. A **non-zero exit with valid JSON is normal** — it's the CI gate firing because error-severity findings exist. Keep going.

The JSON is `{ package, edition, score, compilerLintAvailable, diagnostics[] }`. Each finding has `ruleId` (`<bucket>/<rule>`), `severity` (`error` | `warning` | `info`), `bucket`, `filePath`, `line`, `column`, `message`, `fixHint`, and `citation`. Buckets: `security`, `abilities`, `conventions`, `idioms`, `testing`, `functions`, `macros`. `compiler/*` ids come from the Sui compiler's `sui move build --lint` pass.

---

## 2. Triage

Fix in severity order — **errors → warnings → info**. `security/*` and `abilities/*` are real vulnerabilities (public capability leaks, `copy`/`drop` on assets), not style — they're the top priority, never deferred as "stylistic."

Default to **fix-now** for local, mechanical edits. Defer a **specific occurrence** only when the edit is genuinely unsafe — it touches money / asset / capability / access-control logic whose intent you can't verify, or it's a cross-module refactor with no clear recipe. Never defer a whole rule, bucket, or file because some occurrences are risky; split it and fix the safe ones.

Move Doctor has **no rule-disable or false-positive file**. If a finding is a deliberate, documented exception, leave the code as-is and call it out for the user in the summary — don't try to suppress it.

---

## 3. Fix

For each fix-now finding, apply its `fixHint` at the reported `filePath:line:column`, using `citation` as the rationale. Make the smallest correct edit and follow the project's conventions (`CLAUDE.md` / `AGENTS.md`): inline first, no speculative abstraction.

Validate as you go — **the Sui compiler is the gate when it's available**:

- Sui CLI on `PATH`: the package must still build. Errors — run `sui move build` after each fix and revert that one on failure. Warnings/info — batch them, build once, and re-apply serially if the batch breaks the build.
- No Sui CLI: rely on the re-scan in Step 4.

**Working-tree mode** — leave every edit unstaged for `git diff` review. **PR mode** — one branch per `(severity, bucket)` off the default branch: apply → `sui move build` → commit (conventional prefix) → `gh pr create`, labelled `move-doctor`. Branches are file-disjoint, so they're safe to run in parallel; never push to the default branch or force-push.

---

## 4. Re-score + summarize

Re-run `move-doctor --json <same scope>` and read the `score` field — confirm it rose and no new findings appeared. Loop Steps 2–4 until the score stops rising. (Don't compute the score yourself; it's a capped per-rule deduction — always read it from the JSON.)

Then emit a summary (skip any empty section — no filler):

```markdown
## Move Doctor — N fixed, score S_before → S_after / 100

_Working-tree mode: edits are unstaged — review with `git diff`._

### Fixed — errors
- `<bucket>/<rule>` — `<path>:<line>` — <one-line what changed>

### Fixed — warnings & info
- `<bucket>/<rule>` — `<path>:<line>` — <one-line what changed>

### Reverted — build failed
- `<bucket>/<rule>` — `<path>:<line>` — <one-line why>

### Needs your call — deferred
- `<bucket>/<rule>` — `<path>:<line>` — <one-line why this needs human judgment>
```

In PR mode, list the PRs you opened (one inline link each) instead of the file-level "Fixed" sections, and note any buckets dropped because the build wouldn't pass.

---

## Hard rules

- **Working-tree mode**: never commit, stage, or push — the user reviews and commits.
- **PR mode**: only commit files you changed for the current bucket; push only the bucket branch; never force-push or touch the default branch.
- `security/*` and `abilities/*` findings are vulnerabilities — never leave one silently; fix it or flag it with reasoning.
- Never edit `Move.toml` dependencies, addresses, or edition to make a finding disappear.
- Never edit CI workflows in `.github/workflows/` — that's CI's territory.
- Fix from each finding's `fixHint` + `citation`; there are no per-rule docs to fetch.
- Follow the project's coding conventions: inline first, resist speculative abstraction.
