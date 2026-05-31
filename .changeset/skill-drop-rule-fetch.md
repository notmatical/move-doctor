---
"move-doctor": patch
---

The agent skill no longer fetches per-rule recipes from `move.doctor/prompts/rules/*`. Every finding already carries its own `fixHint` and `citation` in `--json`, so the `/movedoctor` flow fixes straight from the diagnostic — one less network dependency and no per-rule doc tree to keep in sync.
