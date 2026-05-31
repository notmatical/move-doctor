import type {
  Diagnostic,
  RuleBucket,
  ScoreResult,
  Severity,
} from "../types.js";
import {
  MAX_SCORE,
  PER_RULE_DEDUCTION_CAP,
  SEVERITY_RANK,
  SEVERITY_WEIGHTS,
} from "./score.const.js";

interface RuleDeduction {
  severity: Severity;
  weight: number;
}

export const computeScore = (
  diagnostics: readonly Diagnostic[]
): ScoreResult => {
  const bySeverity: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  const byBucket: Partial<Record<RuleBucket, number>> = {};
  const deductionByRule = new Map<string, RuleDeduction>();

  for (const diagnostic of diagnostics) {
    bySeverity[diagnostic.severity] += 1;
    byBucket[diagnostic.bucket] = (byBucket[diagnostic.bucket] ?? 0) + 1;
    const weight = SEVERITY_WEIGHTS[diagnostic.severity];
    const prior = deductionByRule.get(diagnostic.ruleId);
    if (prior) {
      prior.weight += weight;
      // a rule is normally single-severity; if mixed, cap by its worst.
      if (SEVERITY_RANK[diagnostic.severity] > SEVERITY_RANK[prior.severity]) {
        prior.severity = diagnostic.severity;
      }
    } else {
      deductionByRule.set(diagnostic.ruleId, {
        weight,
        severity: diagnostic.severity,
      });
    }
  }

  let totalDeductions = 0;
  for (const { weight, severity } of deductionByRule.values()) {
    totalDeductions += Math.min(weight, PER_RULE_DEDUCTION_CAP[severity]);
  }

  const score = Math.max(0, MAX_SCORE - totalDeductions);

  return {
    score,
    deductions: totalDeductions,
    totalFindings: diagnostics.length,
    byBucket,
    bySeverity,
  };
};
