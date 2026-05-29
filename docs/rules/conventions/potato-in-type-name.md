# conventions/potato-in-type-name

**Severity:** `info` &nbsp; **Bucket:** `conventions` &nbsp; **Source:** [Move Book: No Potato in Names](https://move-book.com/guides/code-quality-checklist#no-potato-in-names)

## What this catches

> This page is a v0.1 generated stub. The runtime detector ships the message and fix hint below — see the [source file](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/conventions/potato-in-type-name.ts) for the exact pattern and edge cases the rule covers.

## How an agent should fix it

When move-doctor reports `conventions/potato-in-type-name`:

1. Open the reported file at the diagnostic's `line:column`.
2. Apply the fix described in the diagnostic's `fixHint`.
3. Re-run `npx move-doctor@latest --score` and confirm the score did not regress.
4. Do **not** suppress this rule unless the surrounding code is a documented exception.

## Source

- Rule definition: [`packages/rules/src/rules/conventions/potato-in-type-name.ts`](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/conventions/potato-in-type-name.ts)
- Canonical reference: [Move Book: No Potato in Names](https://move-book.com/guides/code-quality-checklist#no-potato-in-names)
