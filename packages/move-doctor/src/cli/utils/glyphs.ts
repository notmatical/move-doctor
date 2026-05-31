// Single source of truth for terminal glyphs. Legacy Windows consoles (pre
// Windows Terminal) render box-drawing and dingbat glyphs as tofu, so we fall
// back to ASCII there; modern terminals (incl. Windows Terminal, which sets
// WT_SESSION) get the real marks.
const LEGACY_WIN = process.platform === "win32" && !process.env.WT_SESSION;

export const glyph = {
  /** Brand mark / "diagnosis" accent. */
  cross: LEGACY_WIN ? "+" : "✚",
  /** Filled status dot — health at a glance. */
  dot: LEGACY_WIN ? "*" : "●",
  /** Hollow status dot — info / neutral. */
  dotOpen: LEGACY_WIN ? "·" : "○",
  check: LEGACY_WIN ? "√" : "✓",
  warn: LEGACY_WIN ? "!" : "⚠",
  crossMark: LEGACY_WIN ? "x" : "✗",
  /** Action / next-step list marker. */
  pointer: LEGACY_WIN ? ">" : "›",
  /** Inline separator between facts. */
  bullet: "·",
  dash: "—",
} as const;
