import * as path from "node:path";
import type { Diagnostic, InspectResult, RuleBucket, Severity } from "core";
import { colorizeByScore, highlighter, PERFECT_SCORE, scoreLabel } from "core";
import { buildNextSteps } from "./utils/next-steps.js";

const POINTER =
  process.platform === "win32" && !process.env.WT_SESSION ? ">" : "·";

const terminalWidth = (): number => {
  const width = process.stdout.columns ?? 80;
  return Math.max(40, Math.min(width, 80));
};

const buildScoreBar = (score: number, width: number): string => {
  const filled = Math.round((score / PERFECT_SCORE) * width);
  const empty = width - filled;
  return (
    colorizeByScore("█".repeat(filled), score) +
    highlighter.muted("░".repeat(empty))
  );
};

// Minimal ANSI stripper for width math. Picocolors emits SGR sequences in the
// form ESC[Nm — this regex matches that family.
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const stripAnsi = (text: string): string => text.replace(ANSI_PATTERN, "");
const visibleLength = (text: string): number => stripAnsi(text).length;

const formatDurationShort = (durationMs: number): string =>
  durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

export interface InfoCardData {
  durationMs: number | null;
  /** Omit (undefined) to hide the edition fact — workspaces do this since
   *  edition is per-package. `null` shows "edition unset". */
  edition?: string | null;
  findings: { total: number; errors: number; warnings: number; info: number };
  /** Appended to the metadata strip, e.g. "worst of 5" for workspaces. */
  metaSuffix?: string;
  moduleCount: number;
  /** Set for monorepo scans so the card shows "N packages · M modules". */
  packageCount?: number;
  score: number;
  suiVersion: string | null;
  /** Project name (single-package) or workspace name (monorepo). */
  title: string;
}

// Truncate a *plain* (un-ANSI'd) string to a max visible width with an ellipsis.
const truncatePlain = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;

export const buildInfoCard = (data: InfoCardData): string => {
  const { score } = data;
  const width = Math.min(terminalWidth(), 74);
  const inner = width - 4; // one space padding inside each border
  const muted = highlighter.muted;
  const colorScore = (text: string): string => colorizeByScore(text, score);

  // clean top border (no label — the branded header already prints the name).
  const top = `  ${muted(`╭${"─".repeat(width - 2)}╮`)}`;

  // website wordmark on the bottom border.
  const bottomLabel = "move.doctor";
  const bottomFill = Math.max(0, width - 2 - (1 + bottomLabel.length + 2));
  const bottom = `  ${muted(`╰${"─".repeat(bottomFill)} `)}${highlighter.bold(highlighter.accent(bottomLabel))}${muted(" ─╯")}`;

  const blank = `  ${muted("│")}${" ".repeat(width - 2)}${muted("│")}`;
  const row = (content: string): string => {
    const pad = Math.max(0, inner - visibleLength(content));
    return `  ${muted("│")} ${content}${" ".repeat(pad)} ${muted("│")}`;
  };
  const rowLR = (left: string, right: string): string => {
    const pad = Math.max(1, inner - visibleLength(left) - visibleLength(right));
    return `  ${muted("│")} ${left}${" ".repeat(pad)}${right} ${muted("│")}`;
  };

  const scoreLeft = `${colorScore(highlighter.bold(String(score)))} ${muted(`/ ${PERFECT_SCORE}`)}   ${colorScore(scoreLabel(score))}`;
  const scoreLeftWidth = visibleLength(scoreLeft);
  // title can't crowd the score cluster, cap it so rowLR never overflows.
  const title = highlighter.bold(
    truncatePlain(data.title, Math.max(8, inner - scoreLeftWidth - 2))
  );
  const bar = buildScoreBar(score, inner);

  const metaParts: string[] = [];
  if (data.packageCount !== undefined) {
    metaParts.push(
      `${data.packageCount} package${data.packageCount === 1 ? "" : "s"}`
    );
  }
  metaParts.push(
    `${data.moduleCount} module${data.moduleCount === 1 ? "" : "s"}`
  );
  if (data.edition !== undefined) {
    metaParts.push(`edition ${data.edition ?? "unset"}`);
  }
  if (data.suiVersion) {
    metaParts.push(`Sui ${data.suiVersion.split("-")[0]}`);
  }
  if (data.metaSuffix) {
    metaParts.push(data.metaSuffix);
  }
  if (data.durationMs !== null) {
    metaParts.push(`scanned in ${formatDurationShort(data.durationMs)}`);
  }

  // tight separator + truncation guarantees the meta strip stays inside the box.
  const meta = muted(truncatePlain(metaParts.join(" · "), inner));
  const findings = buildFindingsTldr(data.findings);

  return [
    top,
    blank,
    rowLR(scoreLeft, title),
    row(bar),
    blank,
    row(meta),
    row(findings),
    bottom,
  ].join("\n");
};

// One-line findings summary used inside the info card.
const buildFindingsTldr = (f: {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}): string => {
  if (f.total === 0) {
    return highlighter.ok("✓ no findings");
  }
  const head =
    f.total === 1
      ? `${f.total} ${highlighter.bold("finding")}`
      : `${f.total} ${highlighter.bold("findings")}`;
  const breakdown: string[] = [];
  if (f.errors > 0) {
    breakdown.push(
      highlighter.error(`${f.errors} error${f.errors === 1 ? "" : "s"}`)
    );
  }
  if (f.warnings > 0) {
    breakdown.push(
      highlighter.warn(`${f.warnings} warning${f.warnings === 1 ? "" : "s"}`)
    );
  }
  if (f.info > 0) {
    breakdown.push(highlighter.muted(`${f.info} info`));
  }
  return `${head}  ${highlighter.muted(POINTER)}  ${breakdown.join(highlighter.muted(" · "))}`;
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

interface BucketGroup {
  bucket: RuleBucket;
  diagnostics: Diagnostic[];
}

const groupByBucket = (diagnostics: readonly Diagnostic[]): BucketGroup[] => {
  const byBucket = new Map<RuleBucket, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const list = byBucket.get(diagnostic.bucket) ?? [];
    list.push(diagnostic);
    byBucket.set(diagnostic.bucket, list);
  }
  return [...byBucket.entries()]
    .map(([bucket, list]) => ({ bucket, diagnostics: list }))
    .sort(
      (a, b) =>
        severityRank(a) - severityRank(b) ||
        b.diagnostics.length - a.diagnostics.length
    );
};

const severityRank = (group: BucketGroup): number => {
  if (group.diagnostics.some((d) => d.severity === "error")) {
    return 0;
  }
  if (group.diagnostics.some((d) => d.severity === "warning")) {
    return 1;
  }
  return 2;
};

const groupByRule = (diagnostics: Diagnostic[]): Map<string, Diagnostic[]> => {
  const byRule = new Map<string, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const list = byRule.get(diagnostic.ruleId) ?? [];
    list.push(diagnostic);
    byRule.set(diagnostic.ruleId, list);
  }
  return byRule;
};

const buildBucketBreakdownLine = (
  group: BucketGroup,
  columnWidth: number
): string => {
  const errors = group.diagnostics.filter((d) => d.severity === "error").length;
  const warnings = group.diagnostics.filter(
    (d) => d.severity === "warning"
  ).length;
  const infos = group.diagnostics.filter((d) => d.severity === "info").length;
  const parts: string[] = [];
  if (errors > 0) {
    parts.push(
      highlighter.error(`${errors} ${errors === 1 ? "error" : "errors"}`)
    );
  }
  if (warnings > 0) {
    parts.push(
      highlighter.warn(`${warnings} ${warnings === 1 ? "warning" : "warnings"}`)
    );
  }
  if (infos > 0) {
    parts.push(highlighter.muted(`${infos} info`));
  }
  const bucketLabel = group.bucket.padEnd(columnWidth);
  return `  ${highlighter.bold(bucketLabel)}  ${highlighter.muted(POINTER)}  ${parts.join(highlighter.muted(" · "))}`;
};

const buildRuleHeaderLine = (
  ruleId: string,
  ruleDiagnostics: Diagnostic[],
  ruleColumnWidth: number
): string => {
  const first = ruleDiagnostics[0]!;
  const icon = colorizeBySeverity(severityIcon(first.severity), first.severity);
  const count = ruleDiagnostics.length;
  const countBadge = count > 1 ? `  ${highlighter.muted(`×${count}`)}` : "";
  const padded = colorizeBySeverity(
    ruleId.padEnd(ruleColumnWidth),
    first.severity
  );
  const citation = first.citation
    ? `  ${highlighter.muted(first.citation)}`
    : "";
  return `  ${icon} ${padded}${citation}${countBadge}`;
};

interface RenderContext {
  durationMs: number | null;
  hasInstalledSkill: boolean;
  hasSuiCli: boolean;
  moduleCount: number;
  packageCount?: number;
  scannedFileCount: number;
  suiVersion: string | null;
}

const cardFromContext = (
  result: InspectResult,
  context: RenderContext
): string =>
  buildInfoCard({
    score: result.score.score,
    title: result.project.packageName,
    edition: result.project.edition,
    suiVersion: context.suiVersion,
    moduleCount: context.moduleCount,
    durationMs: context.durationMs,
    packageCount: context.packageCount,
    findings: {
      total: result.score.totalFindings,
      errors: result.score.bySeverity.error,
      warnings: result.score.bySeverity.warning,
      info: result.score.bySeverity.info,
    },
  });

const buildCompactSummary = (
  result: InspectResult,
  context: RenderContext
): string => {
  const lines: string[] = [];
  lines.push(cardFromContext(result, context));

  // build the bucket breakdown (the "where")
  if (result.diagnostics.length > 0) {
    lines.push("");
    const bucketGroups = groupByBucket(result.diagnostics);
    const bucketColumnWidth = Math.max(
      ...bucketGroups.map((g) => g.bucket.length),
      0
    );
    for (const group of bucketGroups) {
      lines.push(buildBucketBreakdownLine(group, bucketColumnWidth));
    }
  }

  if (!(result.compilerLintAvailable || context.hasSuiCli)) {
    lines.push("");
    lines.push(
      highlighter.muted(
        `  ${POINTER} Sui CLI not found on PATH — compiler lints (W0*) skipped.`
      )
    );
  }

  const nextSteps = buildNextSteps({
    result,
    hasInstalledSkill: context.hasInstalledSkill,
    hasSuiCli: context.hasSuiCli,
  });
  if (nextSteps.length > 0) {
    lines.push("");
    lines.push(...nextSteps);
  }

  return lines.join("\n");
};

const indentBlock = (text: string, prefix: string): string =>
  text
    .split("\n")
    .map((line) => `${prefix}${line.trimStart()}`)
    .join("\n");

const buildLocation = (
  diagnostic: Diagnostic,
  rootDirectory: string
): string => {
  const relativePath = path
    .relative(rootDirectory, diagnostic.filePath)
    .replace(/\\/g, "/");
  return `${relativePath}:${diagnostic.line}:${diagnostic.column}`;
};

const buildVerboseRuleGroup = (
  ruleId: string,
  ruleDiagnostics: Diagnostic[],
  ruleColumnWidth: number,
  rootDirectory: string
): string[] => {
  const lines: string[] = [];
  lines.push(buildRuleHeaderLine(ruleId, ruleDiagnostics, ruleColumnWidth));

  const first = ruleDiagnostics[0]!;
  lines.push(highlighter.muted(indentBlock(first.message, "      ")));
  if (first.fixHint) {
    const hint = `${POINTER} ${first.fixHint}`;
    lines.push(highlighter.muted(indentBlock(hint, "      ")));
  }

  for (const diagnostic of ruleDiagnostics) {
    lines.push(
      highlighter.muted(`      ${buildLocation(diagnostic, rootDirectory)}`)
    );
  }

  lines.push("");
  return lines;
};

const buildVerboseSummary = (
  result: InspectResult,
  context: RenderContext
): string => {
  const lines: string[] = [];
  lines.push(cardFromContext(result, context));

  if (result.diagnostics.length === 0) {
    if (!(result.compilerLintAvailable || context.hasSuiCli)) {
      lines.push("");
      lines.push(
        highlighter.muted(
          `  ${POINTER} Sui CLI not found on PATH — compiler lints (W0*) skipped.`
        )
      );
    }
    return lines.join("\n");
  }
  lines.push("");
  for (const group of groupByBucket(result.diagnostics)) {
    const ruleGroups = groupByRule(group.diagnostics);
    const bucketColumnWidth = Math.max(
      ...groupByBucket(result.diagnostics).map((g) => g.bucket.length)
    );
    lines.push(buildBucketBreakdownLine(group, bucketColumnWidth));
    lines.push("");
    const ruleColumnWidth = Math.max(
      ...[...ruleGroups.keys()].map((ruleId) => ruleId.length),
      0
    );
    for (const [ruleId, ruleDiagnostics] of ruleGroups) {
      lines.push(
        ...buildVerboseRuleGroup(
          ruleId,
          ruleDiagnostics,
          ruleColumnWidth,
          result.project.rootDirectory
        )
      );
    }
  }
  if (!(result.compilerLintAvailable || context.hasSuiCli)) {
    lines.push(
      highlighter.muted(
        `  ${POINTER} Sui CLI not found on PATH — compiler lints (W0*) skipped.`
      )
    );
    lines.push("");
  }

  const nextSteps = buildNextSteps({
    result,
    hasInstalledSkill: context.hasInstalledSkill,
    hasSuiCli: context.hasSuiCli,
  });
  if (nextSteps.length > 0) {
    lines.push(...nextSteps);
  }
  return lines.join("\n").trimEnd();
};

export interface RenderTextOptions {
  durationMs?: number | null;
  hasInstalledSkill: boolean;
  hasSuiCli: boolean;
  scannedFileCount: number;
  suiVersion: string | null;
  verbose: boolean;
}

export const renderText = (
  result: InspectResult,
  options: RenderTextOptions
): string => {
  const context: RenderContext = {
    scannedFileCount: options.scannedFileCount,
    hasInstalledSkill: options.hasInstalledSkill,
    hasSuiCli: options.hasSuiCli,
    suiVersion: options.suiVersion,
    durationMs: options.durationMs ?? null,
    moduleCount: result.moduleCount,
  };
  return options.verbose
    ? buildVerboseSummary(result, context)
    : buildCompactSummary(result, context);
};

export const renderScoreOnly = (result: InspectResult): string =>
  String(result.score.score);

export const renderJson = (result: InspectResult): string =>
  JSON.stringify(
    {
      package: result.project.packageName,
      edition: result.project.edition,
      score: result.score,
      compilerLintAvailable: result.compilerLintAvailable,
      diagnostics: result.diagnostics,
    },
    null,
    2
  );
