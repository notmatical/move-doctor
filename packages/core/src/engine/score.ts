import type {
  Diagnostic,
  RuleBucket,
  ScoreResult,
  Severity,
} from "../types.js";

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  error: 8,
  warning: 3,
  info: 1,
};

const PER_RULE_DEDUCTION_CAP = 25;
const MAX_SCORE = 100;

export const computeScore = (
  diagnostics: readonly Diagnostic[]
): ScoreResult => {
  const bySeverity: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  const byBucket: Partial<Record<RuleBucket, number>> = {};
  const deductionByRule = new Map<string, number>();

  for (const diagnostic of diagnostics) {
    bySeverity[diagnostic.severity] += 1;
    byBucket[diagnostic.bucket] = (byBucket[diagnostic.bucket] ?? 0) + 1;
    const weight = SEVERITY_WEIGHTS[diagnostic.severity];
    const prior = deductionByRule.get(diagnostic.ruleId) ?? 0;
    deductionByRule.set(diagnostic.ruleId, prior + weight);
  }

  let totalDeductions = 0;
  for (const ruleDeduction of deductionByRule.values()) {
    totalDeductions += Math.min(ruleDeduction, PER_RULE_DEDUCTION_CAP);
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
