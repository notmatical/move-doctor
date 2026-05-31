import * as path from "node:path";
import {
  buildPerPackageChangedFiles,
  discoverWorkspace,
  findGitRoot,
  highlighter,
  isSkillInstalledForWorkspace,
  isWorkflowInstalledForWorkspace,
  MoveManifestMalformedError,
  type MovePackage,
  MoveProjectNotFoundError,
  runInspect,
  runInspectWorkspace,
  selectPackagesByName,
  suiCliCompilerLint,
  type WorkspaceInfo,
  WorkspaceNotFoundError,
} from "core";
import { astRules, fileRules, manifestRules } from "rules";
import { DiffResolutionError, resolveChangedFiles } from "./diff.js";
import { type ParsedArgs, parseArgs } from "./parse-args.js";
import { renderJson, renderScoreOnly, renderText } from "./render.js";
import {
  renderWorkspaceJson,
  renderWorkspaceScoreOnly,
  renderWorkspaceText,
} from "./render-workspace.js";
import { printBrandedHeader, VERSION } from "./utils/branded-header.js";
import { detectContext, detectSuiVersion } from "./utils/detect-context.js";
import { glyph } from "./utils/glyphs.js";
import { runInstallWizard } from "./utils/install-wizard.js";
import { isInteractive } from "./utils/is-ci.js";
import { errorExitCode, writeError } from "./utils/output.js";
import { hasDisabledSetupPrompt } from "./utils/persistent-config.js";
import { promptPackageScope, resolveScope } from "./utils/scope-prompt.js";
import { startSpinner } from "./utils/spinner.js";

const HELP_TEXT = `Move Doctor — A deterministic linter for Sui Move.

Usage:
  move-doctor [directory] [flags]
  move-doctor install [--yes]

Scan flags:
  --verbose             Show file/line refs and fix hints per finding
  --diff[=base]         Only scan files changed vs HEAD (or vs <base>)
  --score               Output only the numeric score
  --json                Emit machine-readable output
  --no-tests            Skip test files (*_tests.move + tests/)
  --no-banner           Skip the branded header

Workspace flags (multi-package projects):
  --all                 Force workspace-wide scan, even when cwd is in a package
  --package=name,other  Scan specific packages (by name or relative path)
  --workspace=<path>    Override workspace-root detection

Setup flags:
  --skip-setup          Skip the post-scan setup wizard prompt
  -y, --yes             Auto-accept defaults
  -h, --help            Show this help
  -v, --version         Show version
`;

// After a scan, offer the interactive setup wizard unless it was suppressed,
// the project is already fully set up, or setup was previously declined.
const offerSetupIfNeeded = async (
  workspace: WorkspaceInfo,
  args: ParsedArgs,
  skillInstalled: boolean
): Promise<void> => {
  const fullySetUp =
    skillInstalled && isWorkflowInstalledForWorkspace(workspace);
  const shouldOffer =
    !args.skipSetup &&
    isInteractive() &&
    !fullySetUp &&
    !(await hasDisabledSetupPrompt(workspace.rootDirectory));
  if (shouldOffer) {
    await runInstallWizard({
      projectRoot: workspace.rootDirectory,
      yes: false,
    });
    process.stdout.write("\n");
  }
};

interface ResolvedScanPlan {
  /** The directory used for spinners + install prompts in single-package mode. */
  focusPackage: MovePackage | null;
  /** When non-null we run a workspace scan; otherwise single-package. */
  packagesToScan: MovePackage[] | null;
  workspace: WorkspaceInfo;
}

/**
 * Decides what to scan:
 *   - explicit `--package=` → workspace scan with the named packages
 *   - explicit `--all` → workspace scan with everything
 *   - workspace has 1 package total → single-package (unchanged from v0.1)
 *   - cwd is inside exactly one discovered package → single-package focus mode
 *   - else → workspace scan with everything (run from the workspace root)
 */
const planScan = (
  workspace: WorkspaceInfo,
  args: ParsedArgs
): ResolvedScanPlan => {
  if (args.packageFilter) {
    const requested = args.packageFilter.split(",");
    const packages = selectPackagesByName(workspace.packages, requested);
    return { workspace, packagesToScan: packages, focusPackage: null };
  }
  if (workspace.packages.length === 1) {
    return {
      workspace,
      packagesToScan: null,
      focusPackage: workspace.packages[0]!,
    };
  }
  if (args.all) {
    return {
      workspace,
      packagesToScan: workspace.packages,
      focusPackage: null,
    };
  }
  if (workspace.cwdPackage) {
    return {
      workspace,
      packagesToScan: null,
      focusPackage: workspace.cwdPackage,
    };
  }
  return { workspace, packagesToScan: workspace.packages, focusPackage: null };
};

const runSinglePackageScan = async (
  workspace: WorkspaceInfo,
  focus: MovePackage,
  args: ParsedArgs,
  showHeader: boolean
): Promise<number> => {
  const diffFlagPassed = args.diff !== false;
  const context = await detectContext(focus.rootDirectory);
  const totalFileCount = context?.sourceFileCount ?? 0;
  const changedFileCount = context?.changedFileCount ?? 0;
  const suiVersion = context?.suiVersion ?? null;

  const scope = await resolveScope({
    totalFileCount,
    changedFileCount,
    diffFlagPassed,
  });

  let changedFiles: string[] | undefined;
  const diffBase = args.diff === false ? true : args.diff;
  const effectiveDiff = scope === "diff" ? diffBase : false;
  if (effectiveDiff !== false) {
    try {
      changedFiles = await resolveChangedFiles(
        focus.rootDirectory,
        effectiveDiff
      );
    } catch (error) {
      if (error instanceof DiffResolutionError) {
        writeError(error.message);
        return 2;
      }
      throw error;
    }
  }

  const scanLabel = changedFiles
    ? `Scanning ${changedFiles.length} changed file${changedFiles.length === 1 ? "" : "s"} in ${focus.packageName}…`
    : `Scanning ${totalFileCount} file${totalFileCount === 1 ? "" : "s"} in ${focus.packageName}…`;
  const scanSpinner = showHeader ? startSpinner(scanLabel) : undefined;

  const scanStartedAt = Date.now();
  let result: Awaited<ReturnType<typeof runInspect>>;
  try {
    result = await runInspect({
      directory: focus.rootDirectory,
      options: {
        verbose: args.verbose,
        includeTests: !args.noTests,
        changedFiles,
      },
      rules: { fileRules, manifestRules, astRules },
      compilerLint: suiCliCompilerLint,
    });
  } catch (error) {
    scanSpinner?.fail("Scan failed");
    if (error instanceof MoveProjectNotFoundError) {
      writeError(`no Move.toml found at or above ${focus.rootDirectory}`);
      return 2;
    }
    if (error instanceof MoveManifestMalformedError) {
      writeError(error.message);
      return 2;
    }
    throw error;
  }
  scanSpinner?.stop();
  const durationMs = Date.now() - scanStartedAt;

  if (
    result.diagnostics.length === 0 &&
    totalFileCount === 0 &&
    !args.json &&
    !args.scoreOnly
  ) {
    process.stderr.write(
      `  ${highlighter.warn(glyph.warn)} ${highlighter.warn("warning")} ${highlighter.muted("— no .move source files found; score does not reflect a real codebase.")}\n`
    );
  }

  if (args.json) {
    process.stdout.write(`${renderJson(result)}\n`);
    return errorExitCode(result.score);
  }
  if (args.scoreOnly) {
    process.stdout.write(`${renderScoreOnly(result)}\n`);
    return errorExitCode(result.score);
  }

  const skillInstalled = isSkillInstalledForWorkspace(workspace);
  process.stdout.write(
    `\n${renderText(result, {
      verbose: args.verbose,
      hasInstalledSkill: skillInstalled,
      hasSuiCli: suiVersion !== null,
      suiVersion,
      durationMs,
    })}\n\n`
  );

  await offerSetupIfNeeded(workspace, args, skillInstalled);
  return errorExitCode(result.score);
};

const runWorkspaceScan = async (
  workspace: WorkspaceInfo,
  packagesToScan: MovePackage[],
  args: ParsedArgs,
  showHeader: boolean
): Promise<number> => {
  const gitRoot =
    workspace.gitRootDirectory ?? (await findGitRoot(workspace.rootDirectory));
  const suiVersion = await detectSuiVersion(workspace.rootDirectory);

  let changedFiles: string[] | undefined;
  const diffFlagPassed = args.diff !== false;
  if (diffFlagPassed) {
    try {
      changedFiles = await resolveChangedFiles(
        gitRoot ?? workspace.rootDirectory,
        args.diff
      );
    } catch (error) {
      if (error instanceof DiffResolutionError) {
        writeError(error.message);
        return 2;
      }
      throw error;
    }
  }
  const changedFilesByPackage = changedFiles
    ? buildPerPackageChangedFiles(workspace, changedFiles)
    : undefined;

  const scanSpinner = showHeader
    ? startSpinner(
        `Scanning ${packagesToScan.length} package${packagesToScan.length === 1 ? "" : "s"}…`
      )
    : undefined;

  const scanStartedAt = Date.now();
  const result = await runInspectWorkspace({
    workspace,
    packagesToScan,
    options: {
      verbose: args.verbose,
      includeTests: !args.noTests,
      changedFiles,
    },
    rules: { fileRules, manifestRules, astRules },
    compilerLint: suiCliCompilerLint,
    changedFilesByPackage,
    onProgress: ({ current, total, package: pkg }) => {
      scanSpinner?.update(`Scanning ${pkg.packageName} (${current}/${total})…`);
    },
  });
  scanSpinner?.stop();
  const durationMs = Date.now() - scanStartedAt;

  if (args.json) {
    process.stdout.write(`${renderWorkspaceJson(workspace, result)}\n`);
    return errorExitCode(result.aggregateScore);
  }
  if (args.scoreOnly) {
    process.stdout.write(`${renderWorkspaceScoreOnly(result)}\n`);
    return errorExitCode(result.aggregateScore);
  }

  const skillInstalled = isSkillInstalledForWorkspace(workspace);
  process.stdout.write(
    `\n${renderWorkspaceText({
      workspace,
      result,
      suiVersion,
      hasInstalledSkill: skillInstalled,
      hasSuiCli: suiVersion !== null,
      verbose: args.verbose,
      durationMs,
    })}\n\n`
  );

  await offerSetupIfNeeded(workspace, args, skillInstalled);
  return errorExitCode(result.aggregateScore);
};

export const runCli = async (argv: readonly string[]): Promise<number> => {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    writeError((error as Error).message);
    process.stderr.write(`\n${HELP_TEXT}`);
    return 2;
  }

  if (args.command === "help") {
    process.stdout.write(HELP_TEXT);
    return 0;
  }
  if (args.command === "version") {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (args.command === "install") {
    if (!(args.json || args.scoreOnly)) {
      printBrandedHeader();
    }
    const startDirectory = path.resolve(args.directory);

    // we want workspace root even if user ran command inside one of the packages
    // fallback to requested dir if discovery fails.
    let projectRoot = startDirectory;
    try {
      const workspace = await discoverWorkspace({
        startDirectory,
        ...(args.workspaceOverride
          ? { workspaceRootOverride: args.workspaceOverride }
          : {}),
      });
      projectRoot = workspace.rootDirectory;
    } catch {
      // skip silently. install can run in a move-less repo (rare but supported)
    }
    await runInstallWizard({ projectRoot, yes: args.yes || !isInteractive() });
    process.stdout.write("\n");
    return 0;
  }

  const showHeader = !(args.json || args.scoreOnly || args.noBanner);
  if (showHeader) {
    printBrandedHeader();
  }

  const directory = path.resolve(args.directory);

  const contextSpinner = showHeader
    ? startSpinner("Detecting Move workspace…")
    : undefined;

  let workspace: WorkspaceInfo;
  try {
    workspace = await discoverWorkspace({
      startDirectory: directory,
      ...(args.workspaceOverride
        ? { workspaceRootOverride: args.workspaceOverride }
        : {}),
    });
  } catch (error) {
    contextSpinner?.fail("No Move project found");
    if (error instanceof WorkspaceNotFoundError) {
      process.stderr.write(
        highlighter.muted(
          `     ${directory}\n     Hint: cd into a Sui Move project root, or pass --workspace=<path>.\n\n`
        )
      );
      return 2;
    }
    if (error instanceof MoveManifestMalformedError) {
      writeError(error.message);
      return 2;
    }
    throw error;
  }

  let plan: ResolvedScanPlan;
  try {
    plan = planScan(workspace, args);
  } catch (error) {
    contextSpinner?.fail("Couldn't resolve scan target");
    writeError((error as Error).message);
    return 2;
  }

  // Detection is done; the diagnosis header below owns the identity (name,
  // packages, Sui), so we just clear the spinner instead of printing a success
  // line that would duplicate it. In a monorepo, when cwd is inside one package,
  // offer an interactive choice to scan just it or the whole workspace
  // (non-interactive runs stay focused and surface an --all hint).
  contextSpinner?.stop();

  const canPromptScope = !(args.json || args.scoreOnly) && isInteractive();
  if (plan.focusPackage && workspace.isMonorepo && canPromptScope) {
    const scope = await promptPackageScope(
      plan.focusPackage.packageName,
      workspace.packages.length
    );
    if (scope === "all") {
      plan = {
        workspace,
        packagesToScan: workspace.packages,
        focusPackage: null,
      };
    }
  } else if (plan.focusPackage && workspace.isMonorepo && showHeader) {
    process.stderr.write(
      highlighter.muted(
        `  ${glyph.pointer} Scanning only ${plan.focusPackage.packageName} — use --all for the whole workspace.\n`
      )
    );
  }

  if (plan.packagesToScan) {
    return runWorkspaceScan(workspace, plan.packagesToScan, args, showHeader);
  }
  if (plan.focusPackage) {
    return runSinglePackageScan(workspace, plan.focusPackage, args, showHeader);
  }

  // should never happen given planScan's branches.
  writeError("internal error: no packages selected to scan");
  return 2;
};
