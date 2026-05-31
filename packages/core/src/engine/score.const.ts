import type { Severity } from "../types.js";

/** Raw deduction weight applied per finding, before the per-rule cap. */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  error: 8,
  warning: 3,
  info: 1,
};

// Per-rule deduction caps, keyed by the rule's most-severe finding. Info is
// capped low so an advisory-heavy but error-free codebase isn't dragged toward
// 0 by a handful of noisy idiom rules — errors and warnings still bite hard.
export const PER_RULE_DEDUCTION_CAP: Record<Severity, number> = {
  error: 25,
  warning: 25,
  info: 5,
};

/** Ordering used to pick a rule's "most severe" finding for its cap. */
export const SEVERITY_RANK: Record<Severity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

export const MAX_SCORE = 100;
