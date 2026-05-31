import * as path from "node:path";
import type { Diagnostic, RuleBucket, Severity } from "core";
import { colorizeByScore, highlighter, PERFECT_SCORE, scoreLabel } from "core";
import {
  HOMEPAGE,
  MAX_CARD_WIDTH,
  MAX_TERM_WIDTH,
  MIN_TERM_WIDTH,
} from "./constants.js";
import { glyph } from "./utils/glyphs.js";
import {
  compositionBar,
  SEVERITY_MARK,
  type SeverityCounts,
} from "./utils/meter.js";
import { hyperlink } from "./utils/terminal.js";

// SGR-only ANSI stripper for width math (picocolors emits ESC[…m).
const ANSI_SGR = new RegExp(`${String.fromCharCode(27)}[[][0-9;]*m`, "g");
const visibleLength = (text: string): number =>
  text.replace(ANSI_SGR, "").length;

const truncatePlain = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;

// ── Shared formatting primitives ─────────────────────────────────────────────

/** Terminal width clamped to a readable range, for full-width bars/headers. */
export const terminalWidth = (): number => {
  const width = process.stdout.columns ?? MAX_TERM_WIDTH;
  return Math.max(MIN_TERM_WIDTH, Math.min(width, MAX_TERM_WIDTH));
};

export const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

const formatDurationShort = (durationMs: number): string =>
  durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`;

export const countSeverities = (
  diagnostics: readonly Diagnostic[]
): SeverityCounts => {
  const counts: SeverityCounts = { errors: 0, warnings: 0, info: 0 };
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === "error") {
      counts.errors += 1;
    } else if (diagnostic.severity === "warning") {
      counts.warnings += 1;
    } else {
      counts.info += 1;
    }
  }
  return counts;
};

/** Filled dot coloured by the worst present severity — left-edge scan signal. */
export const severityDot = (counts: SeverityCounts): string => {
  if (counts.errors > 0) {
    return highlighter.error(glyph.dot);
  }
  if (counts.warnings > 0) {
    return highlighter.warn(glyph.dot);
  }
  return highlighter.muted(glyph.dotOpen);
};

/** "4 errors · 3 warnings · 15 info" with zero-count severities omitted. */
export const severitySummary = (counts: SeverityCounts): string => {
  const parts: string[] = [];
  if (counts.errors > 0) {
    parts.push(highlighter.error(plural(counts.errors, "error")));
  }
  if (counts.warnings > 0) {
    parts.push(highlighter.warn(plural(counts.warnings, "warning")));
  }
  if (counts.info > 0) {
    parts.push(highlighter.muted(`${counts.info} info`));
  }
  return parts.join(highlighter.muted(" · "));
};

// A breakdown row — "● <label>  <bar>  <col>  <col>". Trailing columns are
// joined with two spaces; the label is pre-padded by the caller for alignment.
// Shared by the "by area" and "by package" breakdowns.
export const barRow = (
  dot: string,
  label: string,
  bar: string,
  ...columns: string[]
): string => `  ${dot} ${label}  ${bar}  ${columns.join("  ")}`;

// ── Diagnosis header ─────────────────────────────────────────────────────────

export interface InfoCardData {
  durationMs: number | null;
  /** Omit (undefined) to hide the edition fact — workspaces do this since
   *  edition is per-package. `null` shows "edition unset". */
  edition?: string | null;
  findings: { total: number; errors: number; warnings: number; info: number };
  /** Appended to the metadata strip, e.g. "worst of 5" for workspaces. */
  metaSuffix?: string;
  moduleCount: number;
  /** Set for monorepo scans so the strip shows "N packages · M modules". */
  packageCount?: number;
  score: number;
  suiVersion: string | null;
  /** Project name (single-package) or workspace name (monorepo). */
  title: string;
}

// Legend beneath the health bar; markers reuse the bar's own fill glyphs so the
// legend maps 1:1 onto the segments above it.
const severityLegend = (counts: SeverityCounts, total: number): string => {
  const pct = (n: number): string =>
    highlighter.muted(` ${Math.round((n / total) * 100)}%`);
  const parts: string[] = [];
  if (counts.errors > 0) {
    parts.push(
      highlighter.error(
        `${SEVERITY_MARK.error} ${plural(counts.errors, "error")}`
      ) + pct(counts.errors)
    );
  }
  if (counts.warnings > 0) {
    parts.push(
      highlighter.warn(
        `${SEVERITY_MARK.warning} ${plural(counts.warnings, "warning")}`
      ) + pct(counts.warnings)
    );
  }
  if (counts.info > 0) {
    parts.push(
      highlighter.muted(`${SEVERITY_MARK.info} ${counts.info} info`) +
        pct(counts.info)
    );
  }
  return parts.join("    ");
};

// Top border: "╭─ ✚ diagnosis ───…─── <title> ─╮". The visible region between
// the corners is width-2; everything but the fill dashes is fixed-width.
const buildTopBorder = (
  width: number,
  cross: string,
  title: string
): string => {
  const muted = highlighter.muted;
  const label = "diagnosis";
  // fixed cells = "─ "(2) cross(1) " "(1) label " "(1) " "(1) title " ─"(2)
  const fixed = 8 + label.length;
  const shownTitle = truncatePlain(title, Math.max(4, width - 2 - fixed - 1));
  const fill = Math.max(1, width - 2 - fixed - shownTitle.length);
  return `  ${muted("╭─ ")}${cross}${muted(` ${label} ${"─".repeat(fill)} `)}${highlighter.bold(shownTitle)}${muted(" ─╮")}`;
};

// Bottom border with the move.doctor wordmark (hyperlinked) on the right.
const buildBottomBorder = (width: number): string => {
  const muted = highlighter.muted;
  const label = "move.doctor";
  const fill = Math.max(0, width - 2 - (label.length + 3));
  const wordmark = highlighter.bold(
    highlighter.accent(hyperlink(label, HOMEPAGE))
  );
  return `  ${muted(`╰${"─".repeat(fill)} `)}${wordmark}${muted(" ─╯")}`;
};

// Headline card: a rounded box framing the labelled score, a full-width
// severity-composition bar with its legend, and the metadata strip. Shared by
// single-package and workspace renders (workspace passes packageCount + omits
// edition). The "by area"/"by package" breakdowns render below it, unframed.
export const buildDiagnosisHeader = (data: InfoCardData): string => {
  const { score } = data;
  const color = (text: string): string => colorizeByScore(text, score);
  const width = Math.min(terminalWidth(), MAX_CARD_WIDTH);
  const inner = width - 4; // one space of padding inside each border
  const muted = highlighter.muted;

  const metaParts: string[] = [];
  if (data.packageCount !== undefined) {
    metaParts.push(plural(data.packageCount, "package"));
  }
  metaParts.push(plural(data.moduleCount, "module"));
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

  const counts: SeverityCounts = {
    errors: data.findings.errors,
    warnings: data.findings.warnings,
    info: data.findings.info,
  };

  const blank = `  ${muted("│")}${" ".repeat(width - 2)}${muted("│")}`;
  const row = (content: string): string => {
    const pad = Math.max(0, inner - visibleLength(content));
    return `  ${muted("│")} ${content}${" ".repeat(pad)} ${muted("│")}`;
  };

  const scoreLine = `${muted("score")}  ${color(highlighter.bold(String(score)))} ${muted(`/ ${PERFECT_SCORE}`)}   ${color(glyph.dot)} ${color(highlighter.bold(scoreLabel(score)))}`;
  const legend =
    data.findings.total === 0
      ? `${highlighter.ok(glyph.check)} ${highlighter.ok("clean bill of health")}`
      : severityLegend(counts, data.findings.total);
  const meta = muted(truncatePlain(metaParts.join(" · "), inner));

  return [
    buildTopBorder(width, color(glyph.cross), data.title),
    blank,
    row(scoreLine),
    blank,
    row(compositionBar(counts, inner)),
    row(legend),
    blank,
    row(meta),
    buildBottomBorder(width),
  ].join("\n");
};

// ── Bucket grouping ──────────────────────────────────────────────────────────

export interface BucketGroup {
  bucket: RuleBucket;
  diagnostics: Diagnostic[];
}

const severityRank = (group: BucketGroup): number => {
  if (group.diagnostics.some((d) => d.severity === "error")) {
    return 0;
  }
  if (group.diagnostics.some((d) => d.severity === "warning")) {
    return 1;
  }
  return 2;
};

// Worst-first, then busiest-first — so the most urgent area leads.
export const groupByBucket = (
  diagnostics: readonly Diagnostic[]
): BucketGroup[] => {
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

// ── Verbose per-rule detail (shared by single + workspace) ───────────────────

const severityIcon = (severity: Severity): string => {
  if (severity === "error") {
    return glyph.crossMark;
  }
  if (severity === "warning") {
    return glyph.warn;
  }
  return glyph.bullet;
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

const groupByRule = (diagnostics: Diagnostic[]): Map<string, Diagnostic[]> => {
  const byRule = new Map<string, Diagnostic[]>();
  for (const diagnostic of diagnostics) {
    const list = byRule.get(diagnostic.ruleId) ?? [];
    list.push(diagnostic);
    byRule.set(diagnostic.ruleId, list);
  }
  return byRule;
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
  return `    ${icon} ${padded}${citation}${countBadge}`;
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
  const lines: string[] = [
    buildRuleHeaderLine(ruleId, ruleDiagnostics, ruleColumnWidth),
  ];
  const first = ruleDiagnostics[0]!;
  lines.push(highlighter.muted(indentBlock(first.message, "        ")));
  if (first.fixHint) {
    lines.push(
      highlighter.muted(
        indentBlock(`${glyph.pointer} ${first.fixHint}`, "        ")
      )
    );
  }
  for (const diagnostic of ruleDiagnostics) {
    lines.push(
      highlighter.muted(`        ${buildLocation(diagnostic, rootDirectory)}`)
    );
  }
  lines.push("");
  return lines;
};

// Findings grouped by bucket, then by rule, with messages, fix hints, and file
// locations. Shared between single-package and per-package workspace detail.
export const buildBucketRuleDetail = (
  diagnostics: readonly Diagnostic[],
  rootDirectory: string
): string[] => {
  const lines: string[] = [];
  for (const group of groupByBucket(diagnostics)) {
    lines.push("");
    lines.push(
      `  ${severityDot(countSeverities(group.diagnostics))} ${highlighter.bold(group.bucket)}`
    );
    const ruleGroups = groupByRule(group.diagnostics);
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
          rootDirectory
        )
      );
    }
  }
  return lines;
};
