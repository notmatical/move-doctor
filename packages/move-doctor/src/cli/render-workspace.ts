import type {
  Diagnostic,
  PackageScanResult,
  Severity,
  WorkspaceInfo,
  WorkspaceInspectResult,
} from "core";
import { colorizeByScore, highlighter, PERFECT_SCORE, scoreLabel } from "core";
import { buildInfoCard } from "./render.js";

const POINTER =
  process.platform === "win32" && !process.env.WT_SESSION ? ">" : "·";

const buildBar = (score: number, width: number): string => {
  const filled = Math.round((score / PERFECT_SCORE) * width);
  const empty = width - filled;
  return (
    colorizeByScore("█".repeat(filled), score) +
    highlighter.muted("░".repeat(empty))
  );
};

// The workspace score header reuses the shared info card from render.ts, passing
// the aggregate (worst-wins) score, the summed module count, and the package
// count so the card shows "N packages · M modules · …".
const buildWorkspaceScoreHeader = (
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
  return buildInfoCard({
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

const buildPerPackageTable = (
  perPackage: readonly PackageScanResult[]
): string => {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${highlighter.bold("Per-package scores")}`);

  const nameColWidth = Math.max(
    ...perPackage.map((entry) => entry.relativePath.length),
    "Package".length
  );
  const barWidth = 18;

  const sorted = [...perPackage].sort((a, b) => a.score.score - b.score.score);
  for (const entry of sorted) {
    const name = formatPackageName(entry.relativePath, nameColWidth);
    if (entry.skipped) {
      lines.push(
        `  ${highlighter.muted(entry.relativePath.padEnd(nameColWidth))}  ${highlighter.muted("—")} ${highlighter.muted("·")} ${highlighter.muted("no changed files")}`
      );
      continue;
    }
    const score = entry.score.score;
    const scoreText = colorizeByScore(String(score).padStart(3), score);
    const bar = buildBar(score, barWidth);
    const label = colorizeByScore(scoreLabel(score), score);
    const errors = entry.score.bySeverity.error;
    const warnings = entry.score.bySeverity.warning;
    const infos = entry.score.bySeverity.info;
    const findings: string[] = [];
    if (errors > 0) {
      findings.push(highlighter.error(`${errors}e`));
    }
    if (warnings > 0) {
      findings.push(highlighter.warn(`${warnings}w`));
    }
    if (infos > 0) {
      findings.push(highlighter.muted(`${infos}i`));
    }
    const findingsCol =
      findings.length > 0 ? findings.join(" ") : highlighter.muted("clean");

    // Regular weight (not bold) so the package rows read as data under the bold
    // "Per-package scores" heading, rather than competing with it.
    lines.push(
      `  ${name}  ${scoreText}  ${bar}  ${label.padEnd(10)}  ${findingsCol}`
    );
  }
  return lines.join("\n");
};

const severityIcon = (severity: Severity): string => {
  if (severity === "error") {
    return "✗";
  }
  if (severity === "warning") {
    return "⚠";
  }
  return "·";
};

const colorizeBySeverity = (text: string, severity: Severity): string => {
  if (severity === "error") {
    return highlighter.error(text);
  }
  if (severity === "warning") {
    return highlighter.warn(text);
  }
  return highlighter.muted(text);
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

const buildWorkspaceNextSteps = (options: WorkspaceRenderOptions): string => {
  const lines: string[] = [];
  if (!options.verbose) {
    lines.push(
      `  ${highlighter.muted(POINTER)} For details: ${highlighter.accent("npx move-doctor@latest --verbose")}`
    );
  }
  if (!options.hasInstalledSkill) {
    lines.push(
      `  ${highlighter.muted(POINTER)} Install the agent skill: ${highlighter.accent("npx move-doctor install")}`
    );
  }
  if (!options.hasSuiCli) {
    lines.push(
      `  ${highlighter.muted(POINTER)} Install the Sui CLI to enable compiler lints (W0*).`
    );
  }
  lines.push(
    `  ${highlighter.muted(POINTER)} Full rule catalog: ${highlighter.accent("https://move.doctor/docs/rules")}`
  );
  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
};

const buildVerboseDetails = (
  perPackage: readonly PackageScanResult[]
): string => {
  const sections: string[] = [];
  for (const entry of perPackage) {
    if (entry.diagnostics.length === 0) {
      continue;
    }
    sections.push("");
    sections.push(
      `  ${highlighter.bold(entry.relativePath)} ${highlighter.muted(`(${entry.diagnostics.length} finding${entry.diagnostics.length === 1 ? "" : "s"})`)}`
    );
    const ruleColWidth = Math.max(
      ...entry.diagnostics.map((d) => d.ruleId.length),
      0
    );
    const byRule = new Map<string, Diagnostic[]>();
    for (const diagnostic of entry.diagnostics) {
      const list = byRule.get(diagnostic.ruleId) ?? [];
      list.push(diagnostic);
      byRule.set(diagnostic.ruleId, list);
    }
    for (const [ruleId, diagnostics] of byRule) {
      const first = diagnostics[0]!;
      const icon = colorizeBySeverity(
        severityIcon(first.severity),
        first.severity
      );
      const ruleText = colorizeBySeverity(
        ruleId.padEnd(ruleColWidth),
        first.severity
      );
      const count =
        diagnostics.length > 1
          ? `  ${highlighter.muted(`×${diagnostics.length}`)}`
          : "";
      sections.push(`  ${icon} ${ruleText}${count}`);
      sections.push(highlighter.muted(`      ${first.message}`));
      if (first.fixHint) {
        sections.push(highlighter.muted(`      ${POINTER} ${first.fixHint}`));
      }
      for (const diagnostic of diagnostics) {
        const rel = `${entry.relativePath}/${diagnostic.filePath.split(/[\\/]/).at(-1)}`;
        sections.push(
          highlighter.muted(
            `      ${rel}:${diagnostic.line}:${diagnostic.column}`
          )
        );
      }
    }
  }
  return sections.join("\n");
};

export const renderWorkspaceText = (
  options: WorkspaceRenderOptions
): string => {
  const sections: string[] = [];
  sections.push(
    buildWorkspaceScoreHeader(
      options.workspace,
      options.result,
      options.suiVersion,
      options.durationMs ?? null
    )
  );
  sections.push(buildPerPackageTable(options.result.perPackage));
  if (options.verbose) {
    sections.push(buildVerboseDetails(options.result.perPackage));
  }
  sections.push(buildWorkspaceNextSteps(options));
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
