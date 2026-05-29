# testing/test-prefix-in-tests-module

**Severity:** `info` &nbsp; **Bucket:** `testing` &nbsp; **Source:** [Move Book: Do Not Prefix Tests With test_ in Testing Modules](https://move-book.com/guides/code-quality-checklist#do-not-prefix-tests-with-test_-in-testing-modules)

## What this catches

> This page is a v0.1 generated stub. The runtime detector ships the message and fix hint below — see the [source file](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/testing/test-prefix-in-tests-module.ts) for the exact pattern and edge cases the rule covers.

## How an agent should fix it

When move-doctor reports `testing/test-prefix-in-tests-module`:

1. Open the reported file at the diagnostic's `line:column`.
2. Apply the fix described in the diagnostic's `fixHint`.
3. Re-run `npx move-doctor@latest --score` and confirm the score did not regress.
4. Do **not** suppress this rule unless the surrounding code is a documented exception.

## Source

- Rule definition: [`packages/rules/src/rules/testing/test-prefix-in-tests-module.ts`](https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/testing/test-prefix-in-tests-module.ts)
- Canonical reference: [Move Book: Do Not Prefix Tests With test_ in Testing Modules](https://move-book.com/guides/code-quality-checklist#do-not-prefix-tests-with-test_-in-testing-modules)
