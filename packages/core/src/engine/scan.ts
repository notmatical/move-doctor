import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";
import type { MoveFile, ProjectInfo } from "../types.js";

const SKIPPED_DIRECTORIES = new Set(["build", "node_modules", ".git", ".sui"]);
const TEST_DIRECTORY_NAMES = new Set(["tests"]);

interface WalkOptions {
  changedFiles?: ReadonlySet<string>;
  includeTests: boolean;
}

const walkMoveFiles = async (
  directory: string,
  rootDirectory: string,
  collected: string[],
  options: WalkOptions
): Promise<void> => {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") {
      continue;
    }

    // skip symlinks to prevent a hang when walking during recursion.
    if (entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      if (!options.includeTests && TEST_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      await walkMoveFiles(fullPath, rootDirectory, collected, options);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith(".move")) {
      continue;
    }

    if (options.changedFiles) {
      const relative = path
        .relative(rootDirectory, fullPath)
        .replace(/\\/g, "/");
      if (!options.changedFiles.has(relative)) {
        continue;
      }
    }

    collected.push(fullPath);
  }
};

const readMoveFile = async (filePath: string): Promise<MoveFile | null> => {
  try {
    const source = await readFile(filePath, "utf8");
    return {
      filePath,
      source,
      lines: source.split(/\r?\n/),
    };
  } catch {
    // skip silently, file has become unreadable.
    return null;
  }
};

export const scanMoveFiles = async (
  project: ProjectInfo,
  options: WalkOptions
): Promise<MoveFile[]> => {
  const collected: string[] = [];
  const sourcesDirectory = path.join(project.rootDirectory, "sources");
  const sourcesExist = await stat(sourcesDirectory)
    .then((stats) => stats.isDirectory())
    .catch(() => false);
  const startDirectory = sourcesExist
    ? sourcesDirectory
    : project.rootDirectory;

  await walkMoveFiles(
    startDirectory,
    project.rootDirectory,
    collected,
    options
  );

  if (options.includeTests) {
    const testsDirectory = path.join(project.rootDirectory, "tests");
    const testsExist = await stat(testsDirectory)
      .then((stats) => stats.isDirectory())
      .catch(() => false);

    if (testsExist && !sourcesExist) {
      // already covered by startDirectory walk in the root-only case
    } else if (testsExist) {
      await walkMoveFiles(
        testsDirectory,
        project.rootDirectory,
        collected,
        options
      );
    }
  }

  const results = await Promise.all(collected.map(readMoveFile));
  return results.filter((file): file is MoveFile => file !== null);
};
