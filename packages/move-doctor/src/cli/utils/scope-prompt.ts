import { highlighter } from "core";
import { glyph } from "./glyphs.js";
import { isInteractive } from "./is-ci.js";
import { select } from "./prompts.js";

export type PackageScope = "focus" | "all";

// When cwd sits inside one package of a multi-package workspace, ask whether to
// scan just that package or the whole workspace. Defaults to focus (the safe,
// fast choice) when non-interactive or cancelled. Callers gate on isInteractive
// + isMonorepo + absence of an explicit --all/--package flag.
export const promptPackageScope = async (
  focusName: string,
  totalPackages: number
): Promise<PackageScope> => {
  const choice = await select<PackageScope>({
    message: `You're inside ${highlighter.bold(focusName)} — 1 of ${totalPackages} packages. What should I scan?`,
    choices: [
      {
        title: `Just ${focusName}`,
        value: "focus",
        description: "this package only · fast",
      },
      {
        title: `All ${totalPackages} packages`,
        value: "all",
        description: "the whole workspace",
      },
    ],
    initial: 0,
  });
  return choice ?? "focus";
};

export type ScopeChoice = "full" | "diff";

interface ResolveScopeOptions {
  changedFileCount: number;
  diffFlagPassed: boolean;
  totalFileCount: number;
}

// decides whether to scan everything or only the changed files. If no
// changes or if non-interactive, default to full scan.
export const resolveScope = async (
  options: ResolveScopeOptions
): Promise<ScopeChoice> => {
  if (options.diffFlagPassed) {
    return "diff";
  }
  if (options.changedFileCount === 0) {
    return "full";
  }
  if (!isInteractive()) {
    return "full";
  }

  const choice = await select<ScopeChoice>({
    message: "Choose what to scan",
    choices: [
      {
        title: `Full codebase  ${highlighter.muted(`(${options.totalFileCount} files)`)}`,
        value: "full",
      },
      {
        title: `Changed files only  ${highlighter.muted(`(${options.changedFileCount} files)`)}`,
        description: "Faster · use when iterating on a branch",
        value: "diff",
      },
    ],
    initial: 0,
  });

  return choice ?? "full";
};

export const printScopeNotice = (scope: ScopeChoice, count: number): void => {
  if (scope === "diff") {
    process.stderr.write(
      `  ${highlighter.muted(glyph.pointer)} Scanning ${count} changed file${count === 1 ? "" : "s"}.\n`
    );
  }
};
