import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";

export interface ProjectContext {
  changedFileCount: number;
  edition: string | null;
  hasGit: boolean;
  packageName: string;
  rootDirectory: string;
  sourceFileCount: number;
  suiVersion: string | null;
}

const runCommand = (
  command: string,
  args: readonly string[],
  cwd: string
): Promise<{ stdout: string; exitCode: number } | null> =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    try {
      const child = spawn(command, args, {
        cwd,
        shell: process.platform === "win32",
      });
      child.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
      child.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));
      child.on("error", () => resolve(null));
      child.on("close", (code) =>
        resolve({ stdout: stdout + stderr, exitCode: code ?? 1 })
      );
    } catch {
      resolve(null);
    }
  });

export const detectSuiVersion = async (cwd: string): Promise<string | null> => {
  const result = await runCommand("sui", ["--version"], cwd);
  if (!result || result.exitCode !== 0) {
    return null;
  }
  const match = result.stdout.match(/sui\s+(\S+)/);
  return match?.[1] ?? null;
};

const detectGitChanges = async (
  cwd: string
): Promise<{ hasGit: boolean; count: number }> => {
  const result = await runCommand("git", ["status", "--porcelain"], cwd);
  if (!result) {
    return { hasGit: false, count: 0 };
  }
  if (result.exitCode !== 0) {
    return { hasGit: false, count: 0 };
  }
  const changedFiles = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".move"));
  return { hasGit: true, count: changedFiles.length };
};

export const findManifestUpward = (startDirectory: string): string | null => {
  let currentDirectory = path.resolve(startDirectory);
  while (true) {
    const candidate = path.join(currentDirectory, "Move.toml");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(currentDirectory);
    if (parent === currentDirectory) {
      return null;
    }
    currentDirectory = parent;
  }
};

const parseField = (source: string, field: string): string | null => {
  const match = source.match(
    new RegExp(`^\\s*${field}\\s*=\\s*"([^"]+)"`, "m")
  );
  return match?.[1] ?? null;
};

const countSourceFiles = async (rootDirectory: string): Promise<number> => {
  const sourcesDirectory = path.join(rootDirectory, "sources");
  if (!existsSync(sourcesDirectory)) {
    return 0;
  }
  const { readdir } = await import("node:fs/promises");
  let count = 0;
  const queue: string[] = [sourcesDirectory];
  while (queue.length > 0) {
    const current = queue.shift()!;
    try {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "build") {
          continue;
        }
        const fullPath = path.join(current, entry.name);
        if (entry.isFile() && entry.name.endsWith(".move")) {
          count += 1;
        } else if (entry.isDirectory()) {
          queue.push(fullPath);
        }
      }
    } catch {}
  }
  return count;
};

export const detectContext = async (
  startDirectory: string
): Promise<ProjectContext | null> => {
  const manifestPath = findManifestUpward(startDirectory);
  if (!manifestPath) {
    return null;
  }
  const rootDirectory = path.dirname(manifestPath);

  let manifestSource: string;
  try {
    manifestSource = await readFile(manifestPath, "utf8");
  } catch {
    return null;
  }

  const [{ hasGit, count: changedFileCount }, suiVersion, sourceFileCount] =
    await Promise.all([
      detectGitChanges(rootDirectory),
      detectSuiVersion(rootDirectory),
      countSourceFiles(rootDirectory),
    ]);

  return {
    rootDirectory,
    packageName: parseField(manifestSource, "name") ?? "<unknown>",
    edition: parseField(manifestSource, "edition"),
    hasGit,
    changedFileCount,
    suiVersion,
    sourceFileCount,
  };
};
