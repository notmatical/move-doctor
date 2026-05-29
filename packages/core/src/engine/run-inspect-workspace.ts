import * as path from "node:path";
import type {
  MovePackage,
  WorkspaceInfo,
} from "../project-info/discover-workspace.js";
import type {
  Diagnostic,
  InspectOptions,
  PackageScanResult,
  RuleBucket,
  ScoreResult,
  Severity,
  WorkspaceInspectResult,
} from "../types.js";
import {
  type CompilerLintAdapter,
  type RuleSet,
  runInspect,
} from "./run-inspect.js";
import { computeScore } from "./score.js";

export interface RunInspectWorkspaceInput {
  /** Per-package changed-file filter, e.g. when --diff is in effect. */
  changedFilesByPackage?: ReadonlyMap<string, string[]>;
  compilerLint?: CompilerLintAdapter;
  /** Called after each package finishes so the CLI can update its progress spinner. */
  onProgress?: (event: {
    current: number;
    total: number;
    package: MovePackage;
  }) => void;
  options: InspectOptions;
  /** Subset of `workspace.packages` to actually scan. */
  packagesToScan: readonly MovePackage[];
  rules: RuleSet;
  workspace: WorkspaceInfo;
}

/**
 * Sequential workspace scan. Each package runs the same `runInspect` flow used
 * in single-package mode, so per-package rule semantics are unchanged.
 */
export const runInspectWorkspace = async (
  input: RunInspectWorkspaceInput
): Promise<WorkspaceInspectResult> => {
  const perPackage: PackageScanResult[] = [];
  const allDiagnostics: Diagnostic[] = [];
  let scannedPackageCount = 0;
  let skippedPackageCount = 0;
  let allCompilerLintAvailable = true;

  for (let index = 0; index < input.packagesToScan.length; index += 1) {
    const movePackage = input.packagesToScan[index]!;
    input.onProgress?.({
      current: index + 1,
      total: input.packagesToScan.length,
      package: movePackage,
    });

    const perPackageChanged = input.changedFilesByPackage?.get(
      movePackage.rootDirectory
    );
    if (
      input.options.changedFiles !== undefined &&
      perPackageChanged !== undefined &&
      perPackageChanged.length === 0
    ) {
      // diff mode produced zero changed .move files for this package. skip
      // the scan entirely and emit a stub PackageScanResult so the renderer
      // can show a "no changed files" line.
      skippedPackageCount += 1;
      perPackage.push({
        project: {
          rootDirectory: movePackage.rootDirectory,
          manifestPath: movePackage.manifestPath,
          packageName: movePackage.packageName,
          edition: movePackage.edition,
        },
        diagnostics: [],
        score: computeScore([]),
        compilerLintAvailable: false,
        fileCount: 0,
        moduleCount: 0,
        relativePath: movePackage.relativePath,
        skipped: { reason: "no-changed-files" },
      });
      continue;
    }

    const packageOptions: InspectOptions = {
      ...input.options,
      changedFiles: perPackageChanged ?? input.options.changedFiles,
    };

    const result = await runInspect({
      directory: movePackage.rootDirectory,
      options: packageOptions,
      rules: input.rules,
      ...(input.compilerLint ? { compilerLint: input.compilerLint } : {}),
    });

    if (!result.compilerLintAvailable) {
      allCompilerLintAvailable = false;
    }

    perPackage.push({
      ...result,
      relativePath: movePackage.relativePath,
    });
    allDiagnostics.push(...result.diagnostics);
    scannedPackageCount += 1;
  }

  return {
    perPackage,
    diagnostics: allDiagnostics,
    aggregateScore: buildAggregateScore(perPackage),
    compilerLintAvailable: allCompilerLintAvailable,
    scannedPackageCount,
    skippedPackageCount,
  };
};

/**
 * Headline `score` is the minimum across scanned packages (worst-wins).
 * `bySeverity` / `byBucket` / `totalFindings` / `deductions` are summed —
 * those are correct totals across the workspace. The headline-score-vs-sums
 * inconsistency is deliberate and surfaced by the renderer ("worst of N").
 */
const buildAggregateScore = (
  perPackage: readonly PackageScanResult[]
): ScoreResult => {
  const scoredPackages = perPackage.filter(
    (entry) => entry.skipped === undefined
  );
  if (scoredPackages.length === 0) {
    return computeScore([]);
  }

  const minScore = scoredPackages.reduce(
    (worst, entry) => (entry.score.score < worst ? entry.score.score : worst),
    scoredPackages[0]!.score.score
  );

  const bySeverity: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  const byBucket: Partial<Record<RuleBucket, number>> = {};
  let totalDeductions = 0;
  let totalFindings = 0;
  for (const entry of scoredPackages) {
    bySeverity.error += entry.score.bySeverity.error;
    bySeverity.warning += entry.score.bySeverity.warning;
    bySeverity.info += entry.score.bySeverity.info;
    totalFindings += entry.score.totalFindings;
    totalDeductions += entry.score.deductions;
    for (const [bucket, count] of Object.entries(entry.score.byBucket)) {
      if (count === undefined) {
        continue;
      }
      const key = bucket as RuleBucket;
      byBucket[key] = (byBucket[key] ?? 0) + count;
    }
  }

  return {
    score: minScore,
    deductions: totalDeductions,
    totalFindings,
    byBucket,
    bySeverity,
  };
};

export const buildPerPackageChangedFiles = (
  workspace: WorkspaceInfo,
  changedFiles: readonly string[]
): Map<string, string[]> => {
  const byPackage = new Map<string, string[]>();
  for (const movePackage of workspace.packages) {
    byPackage.set(movePackage.rootDirectory, []);
  }
  for (const changedFile of changedFiles) {
    // changedFile is workspace-root-relative POSIX path
    const absoluteChanged = path.resolve(workspace.rootDirectory, changedFile);
    let bestMatch: MovePackage | null = null;
    for (const movePackage of workspace.packages) {
      const relative = path.relative(
        movePackage.rootDirectory,
        absoluteChanged
      );
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        continue;
      }
      if (
        bestMatch === null ||
        movePackage.rootDirectory.length > bestMatch.rootDirectory.length
      ) {
        bestMatch = movePackage;
      }
    }
    if (bestMatch) {
      const packageRelative = path
        .relative(bestMatch.rootDirectory, absoluteChanged)
        .replace(/\\/g, "/");
      byPackage.get(bestMatch.rootDirectory)?.push(packageRelative);
    }
  }
  return byPackage;
};
