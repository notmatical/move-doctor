import { spawn } from "node:child_process";
import { type Dirent, existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { ProjectInfo } from "../types.js";

// directories that never contain a real move package; skip during BFS so we
// don't waste time descending into vendored / generated / VCS trees.
const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "build",
  "target",
  ".git",
  ".sui",
  "dist",
  ".next",
  ".turbo",
  "coverage",
  ".vscode",
]);

const MAX_WALK_DEPTH = 5;

export interface MovePackage extends ProjectInfo {
  /** Path relative to the workspace root (POSIX slashes). */
  relativePath: string;
}

export interface WorkspaceInfo {
  /**
   * When `cwd` is inside exactly one discovered package, this is that package
   * and the CLI defaults to "focus mode" (scan just this one). When `cwd`
   * is at the workspace root or the marker, this is null.
   */
  cwdPackage: MovePackage | null;
  /** Git root if available */
  gitRootDirectory: string | null;
  /** True when the workspace looks like a monorepo (>=2 packages discovered). */
  isMonorepo: boolean;
  /** Every Move package discovered under the workspace root. */
  packages: MovePackage[];
  /** Where install artifacts (SKILL.md, .github/workflows) anchor. */
  rootDirectory: string;
}

export class WorkspaceNotFoundError extends Error {
  constructor(searchedFrom: string) {
    super(
      `no Move.toml found at or below ${searchedFrom}, and no git repository`
    );
    this.name = "WorkspaceNotFoundError";
  }
}

const isDirectory = (candidate: string): boolean => {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
};

const isFile = (candidate: string): boolean => {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
};

const runGit = (cwd: string, args: readonly string[]): Promise<string | null> =>
  new Promise((resolve) => {
    let stdout = "";
    try {
      const child = spawn("git", args, {
        cwd,
        shell: process.platform === "win32",
      });
      child.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
      child.on("error", () => resolve(null));
      child.on("close", (code) => resolve(code === 0 ? stdout.trim() : null));
    } catch {
      resolve(null);
    }
  });

export const findGitRoot = async (
  startDirectory: string
): Promise<string | null> => {
  const output = await runGit(startDirectory, ["rev-parse", "--show-toplevel"]);
  return output ? path.resolve(output) : null;
};

const findNearestManifestDirectory = (
  startDirectory: string
): string | null => {
  let currentDirectory = path.resolve(startDirectory);
  while (true) {
    if (isFile(path.join(currentDirectory, "Move.toml"))) {
      return currentDirectory;
    }
    const parent = path.dirname(currentDirectory);
    if (parent === currentDirectory) {
      return null;
    }
    currentDirectory = parent;
  }
};

const discoverMoveTomlsDepthFirst = (rootDirectory: string): string[] => {
  const found: string[] = [];
  const pending: { directory: string; depth: number }[] = [
    { directory: rootDirectory, depth: 0 },
  ];

  while (pending.length > 0) {
    const next = pending.pop();
    if (!next) {
      continue;
    }

    const { directory, depth } = next;
    if (isFile(path.join(directory, "Move.toml"))) {
      found.push(directory);
      // no need to go further, packages cannot be nested.
      continue;
    }

    if (depth >= MAX_WALK_DEPTH) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name.startsWith(".")) {
        continue;
      }
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      pending.push({
        directory: path.join(directory, entry.name),
        depth: depth + 1,
      });
    }
  }

  return found.sort();
};

const parseField = (manifestSource: string, field: string): string | null => {
  const match = manifestSource.match(
    new RegExp(`^\\s*${field}\\s*=\\s*"([^"]+)"`, "m")
  );

  return match?.[1] ?? null;
};

const buildMovePackage = async (
  manifestDirectory: string,
  workspaceRoot: string
): Promise<MovePackage | null> => {
  const manifestPath = path.join(manifestDirectory, "Move.toml");
  try {
    const manifestSource = await readFile(manifestPath, "utf8");
    return {
      rootDirectory: manifestDirectory,
      manifestPath,
      packageName:
        parseField(manifestSource, "name") ?? path.basename(manifestDirectory),
      edition: parseField(manifestSource, "edition"),
      relativePath:
        path.relative(workspaceRoot, manifestDirectory).replace(/\\/g, "/") ||
        ".",
    };
  } catch {
    return null;
  }
};

export const findOwningPackage = (
  packages: readonly MovePackage[],
  cwd: string
): MovePackage | null => {
  const absoluteCwd = path.resolve(cwd);
  let best: MovePackage | null = null;
  let bestDepth = -1;
  for (const candidate of packages) {
    const candidateRoot = path.resolve(candidate.rootDirectory);
    const relative = path.relative(candidateRoot, absoluteCwd);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      continue;
    }

    if (candidateRoot.length > bestDepth) {
      best = candidate;
      bestDepth = candidateRoot.length;
    }
  }
  return best;
};

interface DiscoverWorkspaceInput {
  startDirectory: string;
  /** Explicit override; bypasses git-root + filesystem search. */
  workspaceRootOverride?: string;
}

/**
 * Resolves the workspace root and enumerates every Move package below it.
 *
 * Algorithm:
 * 1. Explicit `--workspace=<path>` wins.
 * 2. Otherwise find the git root (`git rev-parse --show-toplevel`). If it
 *    contains at least one `Move.toml` descendant, it's the workspace root.
 *    Git root is preferred because it's where `.github/workflows/` reside.
 * 3. Otherwise fall back to the nearest `Move.toml`.
 */
export const discoverWorkspace = async (
  input: DiscoverWorkspaceInput
): Promise<WorkspaceInfo> => {
  const startDirectory = path.resolve(input.startDirectory);

  let workspaceRoot: string | null = null;
  let gitRoot: string | null = null;

  if (input.workspaceRootOverride) {
    workspaceRoot = path.resolve(input.workspaceRootOverride);
    if (!isDirectory(workspaceRoot)) {
      throw new WorkspaceNotFoundError(workspaceRoot);
    }
    gitRoot = await findGitRoot(workspaceRoot);
  } else {
    gitRoot = await findGitRoot(startDirectory);
    if (gitRoot && discoverMoveTomlsDepthFirst(gitRoot).length > 0) {
      workspaceRoot = gitRoot;
    } else {
      const nearest = findNearestManifestDirectory(startDirectory);
      workspaceRoot = nearest ?? gitRoot;
    }
  }

  if (!workspaceRoot) {
    throw new WorkspaceNotFoundError(startDirectory);
  }

  const manifestDirectories = discoverMoveTomlsDepthFirst(workspaceRoot);
  if (manifestDirectories.length === 0) {
    throw new WorkspaceNotFoundError(workspaceRoot);
  }

  const packageResults = await Promise.all(
    manifestDirectories.map((directory) =>
      buildMovePackage(directory, workspaceRoot!)
    )
  );
  const packages = packageResults.filter(
    (entry): entry is MovePackage => entry !== null
  );

  if (packages.length === 0) {
    throw new WorkspaceNotFoundError(workspaceRoot);
  }

  const cwdPackage = findOwningPackage(packages, startDirectory);

  return {
    rootDirectory: workspaceRoot,
    gitRootDirectory: gitRoot,
    packages,
    cwdPackage,
    isMonorepo: packages.length > 1,
  };
};

/**
 * Filters packages by name or relative path. Used by `--package=name,other`.
 * Names match against `packageName` or the relative path; missing names throw
 * a descriptive error listing what's available.
 */
export const selectPackagesByName = (
  packages: readonly MovePackage[],
  requested: readonly string[]
): MovePackage[] => {
  const resolved: MovePackage[] = [];
  for (const name of requested) {
    const trimmed = name.trim();
    if (!trimmed) {
      continue;
    }
    const match = packages.find(
      (candidate) =>
        candidate.packageName === trimmed ||
        candidate.relativePath === trimmed ||
        path.basename(candidate.rootDirectory) === trimmed
    );
    if (!match) {
      const available = packages.map((p) => p.packageName).join(", ");
      throw new Error(
        `package "${trimmed}" not found. Available: ${available}`
      );
    }
    if (!resolved.includes(match)) {
      resolved.push(match);
    }
  }
  return resolved;
};

export const isSkillInstalledForWorkspace = (
  workspace: WorkspaceInfo
): boolean =>
  existsSync(
    path.join(
      workspace.rootDirectory,
      ".agents",
      "skills",
      "move-doctor",
      "SKILL.md"
    )
  );

export const isWorkflowInstalledForWorkspace = (
  workspace: WorkspaceInfo
): boolean =>
  existsSync(
    path.join(
      workspace.rootDirectory,
      ".github",
      "workflows",
      "move-doctor.yml"
    )
  );
