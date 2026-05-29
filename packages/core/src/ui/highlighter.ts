import pc from "picocolors";

export const highlighter = {
  error: pc.red,
  warn: pc.yellow,
  ok: pc.green,
  accent: pc.cyan,
  muted: pc.dim,
  bold: pc.bold,
  underline: pc.underline,
  bgGreen: pc.bgGreen,
  bgYellow: pc.bgYellow,
  bgRed: pc.bgRed,
};

export const colorEnabled = (): boolean => pc.isColorSupported;

// Score thresholds. Anything >= GOOD is a "happy" score; OK is "could be
// better"; below OK is "tank face." Mirrors react-doctor's bands.
export const PERFECT_SCORE = 100;
export const SCORE_GOOD_THRESHOLD = 80;
export const SCORE_OK_THRESHOLD = 50;

export const colorizeByScore = (text: string, score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) {
    return highlighter.ok(text);
  }
  if (score >= SCORE_OK_THRESHOLD) {
    return highlighter.warn(text);
  }
  return highlighter.error(text);
};

// Score label — plain quality scale. Single source of truth so the CLI (single
// + workspace) and the website all agree.
//   95 → excellent · 84 → good · 62 → needs improvement · 30 → poor
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
