import { highlighter } from "core";
import { isInteractive } from "./is-ci.js";
import { select } from "./prompts.js";

const POINTER =
  process.platform === "win32" && !process.env.WT_SESSION ? ">" : "›";

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
      `  ${highlighter.muted(POINTER)} Scanning ${count} changed file${count === 1 ? "" : "s"}.\n`
    );
  }
};
