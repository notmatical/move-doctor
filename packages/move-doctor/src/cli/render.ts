import type { Diagnostic, InspectResult } from "core";
import { highlighter } from "core";
import { BAR_WIDTH } from "./constants.js";
import {
  barRow,
  buildBucketRuleDetail,
  buildDiagnosisHeader,
  countSeverities,
  groupByBucket,
  severityDot,
  severitySummary,
} from "./render-common.js";
import { glyph } from "./utils/glyphs.js";
import { magnitudeBar } from "./utils/meter.js";
import { buildNextSteps } from "./utils/next-steps.js";

// "by area" — one magnitude+composition bar per rule bucket, worst-first. Bar
// length is the bucket's share of the busiest bucket; colour/density is its own
// severity mix, so hot spots jump out by both size and redness.
const buildAreaBreakdown = (diagnostics: readonly Diagnostic[]): string[] => {
  const groups = groupByBucket(diagnostics);
  const labelWidth = Math.max(...groups.map((g) => g.bucket.length), 0);
  const maxTotal = Math.max(...groups.map((g) => g.diagnostics.length), 1);

  const lines: string[] = ["", `  ${highlighter.bold("by area")}`];
  for (const group of groups) {
    const counts = countSeverities(group.diagnostics);
    const bar = magnitudeBar(counts, BAR_WIDTH, maxTotal);
    const count = highlighter.bold(
      String(group.diagnostics.length).padStart(3)
    );
    lines.push(
      barRow(
        severityDot(counts),
        group.bucket.padEnd(labelWidth),
        bar,
        count,
        severitySummary(counts)
      )
    );
  }
  return lines;
};

const buildFindingsDetail = (
  diagnostics: readonly Diagnostic[],
  rootDirectory: string
): string[] => [
  "",
  `  ${highlighter.bold("findings")}`,
  ...buildBucketRuleDetail(diagnostics, rootDirectory),
];

interface RenderContext {
  durationMs: number | null;
  hasInstalledSkill: boolean;
  hasSuiCli: boolean;
  moduleCount: number;
  packageCount?: number;
  suiVersion: string | null;
}

const headerFromContext = (
  result: InspectResult,
  context: RenderContext
): string =>
  buildDiagnosisHeader({
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

const suiMissingNote = (): string =>
  highlighter.muted(
    `  ${glyph.bullet} Sui CLI not found on PATH — compiler lints (W0*) skipped.`
  );

const appendNextSteps = (
  lines: string[],
  result: InspectResult,
  context: RenderContext
): void => {
  const nextSteps = buildNextSteps({
    result,
    hasInstalledSkill: context.hasInstalledSkill,
    hasSuiCli: context.hasSuiCli,
  });
  if (nextSteps.length > 0) {
    lines.push("");
    lines.push(...nextSteps);
  }
};

const buildCompactSummary = (
  result: InspectResult,
  context: RenderContext
): string => {
  const lines: string[] = [headerFromContext(result, context)];
  if (result.diagnostics.length > 0) {
    lines.push(...buildAreaBreakdown(result.diagnostics));
  }
  if (!(result.compilerLintAvailable || context.hasSuiCli)) {
    lines.push("");
    lines.push(suiMissingNote());
  }
  appendNextSteps(lines, result, context);
  return lines.join("\n");
};

const buildVerboseSummary = (
  result: InspectResult,
  context: RenderContext
): string => {
  const lines: string[] = [headerFromContext(result, context)];
  if (result.diagnostics.length === 0) {
    if (!(result.compilerLintAvailable || context.hasSuiCli)) {
      lines.push("");
      lines.push(suiMissingNote());
    }
    return lines.join("\n").trimEnd();
  }
  lines.push(...buildAreaBreakdown(result.diagnostics));
  lines.push(
    ...buildFindingsDetail(result.diagnostics, result.project.rootDirectory)
  );
  if (!(result.compilerLintAvailable || context.hasSuiCli)) {
    lines.push(suiMissingNote());
  }
  appendNextSteps(lines, result, context);
  return lines.join("\n").trimEnd();
};

export interface RenderTextOptions {
  durationMs?: number | null;
  hasInstalledSkill: boolean;
  hasSuiCli: boolean;
  suiVersion: string | null;
  verbose: boolean;
}

export const renderText = (
  result: InspectResult,
  options: RenderTextOptions
): string => {
  const context: RenderContext = {
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
