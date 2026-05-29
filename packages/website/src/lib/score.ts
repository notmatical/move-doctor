// Mirrors the CLI score bands in core/src/ui/highlighter.ts so the website and
// the terminal agree on color + label for any given score.

export const SCORE_GOOD_THRESHOLD = 80;
export const SCORE_OK_THRESHOLD = 50;

export type ScoreBand = "ok" | "warn" | "error";

export const scoreBand = (score: number): ScoreBand => {
  if (score >= SCORE_GOOD_THRESHOLD) {
    return "ok";
  }
  if (score >= SCORE_OK_THRESHOLD) {
    return "warn";
  }
  return "error";
};

// Plain quality scale — mirrors core/src/ui/highlighter.ts scoreLabel exactly.
export const scoreLabel = (score: number): string => {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= SCORE_GOOD_THRESHOLD) {
    return "good";
  }
  if (score >= SCORE_OK_THRESHOLD) {
    return "needs improvement";
  }
  return "poor";
};

export const scoreColorVar = (score: number): string => {
  const band = scoreBand(score);
  if (band === "ok") {
    return "var(--color-ok)";
  }
  if (band === "warn") {
    return "var(--color-warn)";
  }
  return "var(--color-error)";
};
