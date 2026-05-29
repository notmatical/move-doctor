# conventions/missing-edition-2024

**Severity:** `warning` &nbsp; **Bucket:** `conventions` &nbsp; **Source:** [Move Book: Use Right Edition](https://move-book.com/guides/code-quality-checklist#use-right-edition)

## What this catches

A `Move.toml` whose `[package]` table either omits the `edition` field entirely or specifies a pre-2024 edition (e.g. `legacy`). Move 2024 is required for the method-syntax, macro, and label-based module forms that every other move-doctor rule assumes.

## Trigger

```toml
[package]
name = "my_package"
# edition omitted
```

## Fix

```toml
[package]
name = "my_package"
edition = "2024.beta"  # or "2024"
```

## How an agent should fix it

1. Open `Move.toml`.
2. Add `edition = "2024.beta"` to the `[package]` table immediately after the `name` field.
3. Re-run `npx move-doctor@latest --score` and confirm the warning is gone.
4. If the build now fails with new lint warnings, those are real Move 2024 idiom upgrades — fix them, don't downgrade the edition.

## Why this is `warning` and not `info`

Without the right edition, ~30 other move-doctor rules can fire on code that *would have been correct* under the legacy edition. Setting the edition is a prerequisite, not a stylistic suggestion.

## Source

- Rule definition: [`packages/rules/src/rules/conventions/missing-edition-2024.ts`](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/conventions/missing-edition-2024.ts)
- Canonical reference: [Move Book: Use Right Edition](https://move-book.com/guides/code-quality-checklist#use-right-edition)
