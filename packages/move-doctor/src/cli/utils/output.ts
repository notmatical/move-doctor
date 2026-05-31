import { highlighter, type ScoreResult } from "core";
import { glyph } from "./glyphs.js";

/** Write an error line to stderr, prefixed with a red ✗. */
export const writeError = (message: string): void => {
  process.stderr.write(`${highlighter.error(glyph.crossMark)} ${message}\n`);
};

/** Exit 1 when any error-severity finding exists (the CI gate), else 0. */
export const errorExitCode = (score: ScoreResult): number =>
  score.bySeverity.error > 0 ? 1 : 0;
