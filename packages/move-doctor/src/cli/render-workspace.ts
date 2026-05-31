import type {
  PackageScanResult,
  WorkspaceInfo,
  WorkspaceInspectResult,
} from "core";
import { colorizeByScore, highlighter, PERFECT_SCORE } from "core";
import { BAR_WIDTH } from "./constants.js";
import {
  barRow,
  buildBucketRuleDetail,
  buildDiagnosisHeader,
  severityDot,
  severitySummary,
} from "./render-common.js";
import { CMD } from "./utils/commands.js";
import { glyph } from "./utils/glyphs.js";
import { magnitudeBar, type SeverityCounts } from "./utils/meter.js";

// Right-aligned to fit "100/100" so the score column lines up across rows.
const SCORE_COL = `${PERFECT_SCORE}/${PERFECT_SCORE}`.length;

const countsOf = (entry: PackageScanResult): SeverityCounts => ({
  errors: entry.score.bySeverity.error,
  warnings: entry.score.bySeverity.warning,
  info: entry.score.bySeverity.info,
});

// The workspace header reuses the shared diagnosis header, passing the aggregate
// (worst-package-wins) score, summed module count, and package count.
const buildWorkspaceHeader = (
  workspace: WorkspaceInfo,
  result: WorkspaceInspectResult,
  suiVersion: string | null,
  durationMs: number | null
): string => {
  const workspaceName =
    workspace.rootDirectory.split(/[\\/]/).pop() ?? "workspace";
  const moduleCount = result.perPackage.reduce(
    (sum, entry) => sum + (entry.skipped ? 0 : entry.moduleCount),
    0
  );
  return buildDiagnosisHeader({
    score: result.aggregateScore.score,
    title: workspaceName,
    suiVersion,
    moduleCount,
    durationMs,
    packageCount: result.scannedPackageCount,
    findings: {
      total: result.aggregateScore.totalFindings,
      errors: result.aggregateScore.bySeverity.error,
      warnings: result.aggregateScore.bySeverity.warning,
      info: result.aggregateScore.bySeverity.info,
    },
  });
};

// Dims the shared directory prefix (e.g. "packages/") so the distinguishing
// leaf name reads at full weight when many rows share the same parent dir.
const formatPackageName = (relativePath: string, width: number): string => {
  const pad = " ".repeat(Math.max(0, width - relativePath.length));
  const sepIndex = Math.max(
    relativePath.lastIndexOf("/"),
    relativePath.lastIndexOf("\\")
  );
  if (sepIndex === -1) {
    return relativePath + pad;
  }
  const prefix = relativePath.slice(0, sepIndex + 1);
  const leaf = relativePath.slice(sepIndex + 1);
  return `${highlighter.muted(prefix)}${leaf}${pad}`;
};

// "by package" — one magnitude+composition bar per package (length = its share
// of the busiest package's finding count, colour = its severity mix) alongside
// the package score. Worst score first, so problem packages surface at the top.
const buildPackageBreakdown = (
  perPackage: readonly PackageScanResult[]
): string[] => {
  const labelWidth = Math.max(
    ...perPackage.map((entry) => entry.relativePath.length),
    "package".length
  );
  const maxTotal = Math.max(
    ...perPackage
      .filter((entry) => !entry.skipped)
      .map((entry) => entry.diagnostics.length),
    1
  );
  const sorted = [...perPackage].sort((a, b) => a.score.score - b.score.score);

  const lines: string[] = [
    "",
    `  ${highlighter.bold("by package")}  ${highlighter.muted(`(score out of ${PERFECT_SCORE})`)}`,
  ];
  for (const entry of sorted) {
    const name = formatPackageName(entry.relativePath, labelWidth);
    if (entry.skipped) {
      lines.push(
        barRow(
          highlighter.muted(glyph.dotOpen),
          name,
          " ".repeat(BAR_WIDTH),
          highlighter.muted("—".padStart(SCORE_COL)),
          highlighter.muted("skipped · no changed files")
        )
      );
      continue;
    }
    const counts = countsOf(entry);
    const bar = magnitudeBar(counts, BAR_WIDTH, maxTotal);
    const score = colorizeByScore(
      `${entry.score.score}/${PERFECT_SCORE}`.padStart(SCORE_COL),
      entry.score.score
    );
    const trailing =
      entry.diagnostics.length === 0
        ? highlighter.ok("clean")
        : severitySummary(counts);
    lines.push(barRow(severityDot(counts), name, bar, score, trailing));
  }
  return lines;
};

interface WorkspaceRenderOptions {
  durationMs?: number | null;
  hasInstalledSkill: boolean;
  hasSuiCli: boolean;
  result: WorkspaceInspectResult;
  suiVersion: string | null;
  verbose: boolean;
  workspace: WorkspaceInfo;
}

const buildWorkspaceNextSteps = (options: WorkspaceRenderOptions): string[] => {
  const lines: string[] = [];
  if (!options.verbose) {
    lines.push(
      `  ${highlighter.muted(glyph.pointer)} For per-finding detail: ${highlighter.accent(CMD.verbose)}`
    );
  }
  if (!options.hasInstalledSkill) {
    lines.push(
      `  ${highlighter.muted(glyph.pointer)} Install the agent skill: ${highlighter.accent(CMD.install)}`
    );
  }
  if (!options.hasSuiCli) {
    lines.push(
      `  ${highlighter.muted(glyph.pointer)} Install the Sui CLI to enable compiler lints (W0*).`
    );
  }
  return lines.length > 0 ? ["", ...lines] : [];
};

// Verbose: per-package findings, grouped by bucket then rule.
const buildWorkspaceDetail = (
  perPackage: readonly PackageScanResult[]
): string[] => {
  const lines: string[] = ["", `  ${highlighter.bold("findings")}`];
  for (const entry of perPackage) {
    if (entry.diagnostics.length === 0) {
      continue;
    }
    const count = entry.diagnostics.length;
    lines.push("");
    lines.push(
      `  ${severityDot(countsOf(entry))} ${highlighter.bold(entry.relativePath)} ${highlighter.muted(`(${count} finding${count === 1 ? "" : "s"})`)}`
    );
    lines.push(
      ...buildBucketRuleDetail(entry.diagnostics, entry.project.rootDirectory)
    );
  }
  return lines;
};

export const renderWorkspaceText = (
  options: WorkspaceRenderOptions
): string => {
  const sections: string[] = [
    buildWorkspaceHeader(
      options.workspace,
      options.result,
      options.suiVersion,
      options.durationMs ?? null
    ),
    ...buildPackageBreakdown(options.result.perPackage),
  ];
  if (options.verbose && options.result.diagnostics.length > 0) {
    sections.push(...buildWorkspaceDetail(options.result.perPackage));
  }
  sections.push(...buildWorkspaceNextSteps(options));
  return sections.join("\n");
};

export const renderWorkspaceJson = (
  workspace: WorkspaceInfo,
  result: WorkspaceInspectResult
): string =>
  JSON.stringify(
    {
      workspace: {
        rootDirectory: workspace.rootDirectory,
        gitRootDirectory: workspace.gitRootDirectory,
        packageCount: workspace.packages.length,
        scanned: result.scannedPackageCount,
        skipped: result.skippedPackageCount,
      },
      aggregateScore: result.aggregateScore,
      perPackage: result.perPackage.map((entry) => ({
        relativePath: entry.relativePath,
        packageName: entry.project.packageName,
        edition: entry.project.edition,
        score: entry.score,
        diagnostics: entry.diagnostics,
        skipped: entry.skipped,
      })),
    },
    null,
    2
  );

export const renderWorkspaceScoreOnly = (
  result: WorkspaceInspectResult
): string => String(result.aggregateScore.score);
