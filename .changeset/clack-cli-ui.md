---
"move-doctor": minor
---

Rebuild the interactive CLI on [@clack/prompts](https://github.com/bombshell-dev/clack), elevate the scan report, and harden the CLI surface.

- **Prompts**: the install wizard is now a cohesive clack flow (`intro`/`spinner`/`log`/`outro`); `select`/`multiselect` are clack-backed and the unmaintained `prompts` package is dropped.
- **Monorepo scope**: running inside a sub-package of a multi-package workspace now asks whether to scan just that package or the whole workspace (defaulting to focus; non-interactive runs stay focused and surface an `--all` hint).
- **Scoring**: info findings are now capped low per rule (5 vs 25), so an error-free but advisory-heavy codebase is no longer dragged to 0/100 — errors and warnings still bite.
- **Redesigned report**: a rounded "diagnosis" card frames the labelled score, a full-width severity-composition bar + percentage legend, and the metadata strip (title on the top border, hyperlinked `move.doctor` wordmark on the bottom). Severity is encoded by colour *and* fill density (`█` errors → `▓` warnings → `▒` info → `░` empty) so bars read as a gradient and survive no-colour terminals. Below the card, a "by area" breakdown (single) and "by package" breakdown (workspace) give every row its own magnitude+composition bar, so hot spots surface by both size and redness. Verbose drills into bucket → rule → location. Clean code shows a solid green bar + "clean bill of health". Covers single, workspace, verbose, and non-verbose consistently.
- **Polish**: the detection line no longer duplicates the header's name/packages/Sui; the score is now explicitly labelled (`score 23 / 100`, per-package `33/100` under a "score out of 100" header); and the `move.doctor` wordmark is an OSC-8 hyperlink to https://move.doctor/ on capable terminals.
- **Cleanup**: shared rendering helpers hoisted into `render-common.ts`; a single `BAR_WIDTH` constant (in `constants.ts`) replaces the duplicated bar widths; centralized terminal glyphs and suggested commands (standardized on `npx move-doctor@latest …`); removed dead code (`install.ts`, unused options); memoized `sui --version` detection.
- Glyphs fall back to ASCII on legacy Windows consoles; `--json`/`--score`/CI output is unchanged.
