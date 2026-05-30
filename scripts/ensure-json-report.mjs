import fs from "node:fs";

// Normalizes a `move-doctor --json` report into a single canonical shape the
// render script can consume without knowing about move-doctor's two output
// modes (single-package: top-level `score` + `diagnostics`; workspace:
// `aggregateScore` + `perPackage[].diagnostics`). When the scan produced no
// valid report, writes a fallback `ok: false` report and exits non-zero so the
// action can surface the failure.

const reportPath = process.argv[2];
const status = Number(process.argv[3] ?? "1");

if (!reportPath) {
  process.exit(0);
}

const scoreLabel = (score) => {
  if (typeof score !== "number") return null;
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 50) return "needs improvement";
  return "poor";
};

const toCanonicalDiagnostic = (diagnostic, packagePath) => ({
  ruleId: diagnostic.ruleId,
  severity: diagnostic.severity,
  bucket: diagnostic.bucket ?? null,
  filePath: diagnostic.filePath,
  line: diagnostic.line ?? 1,
  column: diagnostic.column ?? 1,
  message: diagnostic.message ?? "",
  citation: diagnostic.citation ?? null,
  citationUrl: diagnostic.citationUrl ?? null,
  package: packagePath ?? null,
});

const summarize = (score, diagnostics) => {
  const bySeverity = score?.bySeverity ?? {};
  const affectedFileCount = new Set(diagnostics.map((d) => d.filePath)).size;
  return {
    score: typeof score?.score === "number" ? score.score : null,
    scoreLabel: scoreLabel(score?.score),
    errorCount: bySeverity.error ?? 0,
    warningCount: bySeverity.warning ?? 0,
    infoCount: bySeverity.info ?? 0,
    totalDiagnosticCount: score?.totalFindings ?? diagnostics.length,
    affectedFileCount,
  };
};

// Collapse move-doctor's single-package vs workspace JSON into one report.
const normalize = (report) => {
  if (report && report.aggregateScore) {
    const diagnostics = (report.packages ?? report.perPackage ?? []).flatMap(
      (pkg) =>
        (pkg.diagnostics ?? []).map((d) =>
          toCanonicalDiagnostic(d, pkg.relativePath),
        ),
    );
    return {
      schemaVersion: 1,
      ok: true,
      packageCount:
        report.workspace?.scanned ?? (report.perPackage ?? []).length,
      compilerLintAvailable: report.compilerLintAvailable ?? null,
      summary: summarize(report.aggregateScore, diagnostics),
      diagnostics,
      error: null,
    };
  }
  if (report && report.score) {
    const diagnostics = (report.diagnostics ?? []).map((d) =>
      toCanonicalDiagnostic(d, null),
    );
    return {
      schemaVersion: 1,
      ok: true,
      packageCount: 1,
      compilerLintAvailable: report.compilerLintAvailable ?? null,
      summary: summarize(report.score, diagnostics),
      diagnostics,
      error: null,
    };
  }
  return null;
};

const fallbackReport = {
  schemaVersion: 1,
  ok: false,
  packageCount: 0,
  compilerLintAvailable: null,
  summary: {
    score: null,
    scoreLabel: null,
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    totalDiagnosticCount: 0,
    affectedFileCount: 0,
  },
  diagnostics: [],
  error: {
    message: `move-doctor exited with status ${Number.isFinite(status) ? status : 1} before producing a valid JSON report.`,
  },
};

try {
  const raw = fs.readFileSync(reportPath, "utf8").trim();
  const canonical = normalize(JSON.parse(raw));
  if (canonical) {
    fs.writeFileSync(reportPath, `${JSON.stringify(canonical)}\n`);
    process.exit(0);
  }
} catch {
  // Fall through to the fallback report.
}

fs.writeFileSync(reportPath, `${JSON.stringify(fallbackReport)}\n`);
process.exit(1);
