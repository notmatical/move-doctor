import { describe, expect, it } from "bun:test";
import type { Diagnostic } from "../types.js";
import { computeScore } from "./score.js";

const fakeDiagnostic = (overrides: Partial<Diagnostic>): Diagnostic => ({
  ruleId: "test/example",
  severity: "warning",
  bucket: "conventions",
  filePath: "/tmp/foo.move",
  line: 1,
  column: 1,
  message: "test",
  source: "move-doctor",
  ...overrides,
});

describe("computeScore", () => {
  it("returns 100 for an empty diagnostics list", () => {
    const result = computeScore([]);
    expect(result.score).toBe(100);
    expect(result.totalFindings).toBe(0);
  });

  it("deducts per severity weight", () => {
    const result = computeScore([
      fakeDiagnostic({ ruleId: "a/error", severity: "error" }),
      fakeDiagnostic({ ruleId: "b/warning", severity: "warning" }),
      fakeDiagnostic({ ruleId: "c/info", severity: "info" }),
    ]);
    expect(result.score).toBe(100 - 8 - 3 - 1);
    expect(result.bySeverity).toEqual({ error: 1, warning: 1, info: 1 });
  });

  it("caps deductions per rule at 25", () => {
    const tenErrorsOneRule = Array.from({ length: 10 }, () =>
      fakeDiagnostic({ ruleId: "noisy/rule", severity: "error" })
    );
    const result = computeScore(tenErrorsOneRule);
    expect(result.score).toBe(100 - 25);
  });

  it("floors the score at 0", () => {
    const manyErrors = Array.from({ length: 20 }, (_, index) =>
      fakeDiagnostic({ ruleId: `rule/${index}`, severity: "error" })
    );
    const result = computeScore(manyErrors);
    expect(result.score).toBe(0);
  });
});
