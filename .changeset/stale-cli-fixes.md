---
"move-doctor": patch
---

Fix CLI version drift and misleading workspace output:

- The branded header and `--version` now report the real package version (injected from `package.json` at build time) instead of a hardcoded `0.1.0`.
- In a monorepo, scanning a single focused package no longer prints a misleading `(1 of N)` count — it now matches the standalone-package line.
- Removed the "Full rule catalog" link to `move.doctor/docs/rules`, which doesn't exist yet.
