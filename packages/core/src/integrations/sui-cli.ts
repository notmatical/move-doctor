import { spawn } from "node:child_process";
import * as path from "node:path";
import type { CompilerLintAdapter } from "../engine/run-inspect.js";
import type { Diagnostic, Severity } from "../types.js";

interface SuiLintEntry {
  category: number;
  code: number;
  column: number;
  file: string;
  level: string;
  line: number;
  msg: string;
}

interface RunResult {
  exitCode: number;
  spawnError: Error | null;
  stderr: string;
  stdout: string;
}

const runCommand = (
  command: string,
  args: readonly string[],
  cwd: string
): Promise<RunResult> =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    let spawnError: Error | null = null;
    child.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));
    child.on("error", (error) => (spawnError = error));
    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1, spawnError });
    });
  });

const isSuiOnPath = async (): Promise<boolean> => {
  const result = await runCommand("sui", ["--version"], process.cwd());
  return result.spawnError === null && result.exitCode === 0;
};

const extractJsonArray = (stdout: string): SuiLintEntry[] => {
  const start = stdout.indexOf("\n[");
  let firstChar: number;
  if (stdout.startsWith("[")) {
    firstChar = 0;
  } else {
    firstChar = start === -1 ? -1 : start + 1;
  }
  if (firstChar === -1) {
    return [];
  }
  const lastClose = stdout.lastIndexOf("]");
  if (lastClose < firstChar) {
    return [];
  }
  const slice = stdout.slice(firstChar, lastClose + 1);
  try {
    const parsed = JSON.parse(slice) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isSuiLintEntry);
  } catch {
    return [];
  }
};

const isSuiLintEntry = (value: unknown): value is SuiLintEntry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.file === "string" &&
    typeof candidate.line === "number" &&
    typeof candidate.column === "number" &&
    typeof candidate.level === "string" &&
    typeof candidate.category === "number" &&
    typeof candidate.code === "number" &&
    typeof candidate.msg === "string"
  );
};

const mapLevelToSeverity = (level: string): Severity => {
  const normalized = level.toLowerCase();
  if (normalized.includes("error")) {
    return "error";
  }
  if (normalized.includes("warn")) {
    return "warning";
  }
  return "info";
};

const formatRuleId = (category: number, code: number): string => {
  const cat = category.toString().padStart(2, "0");
  const num = code.toString().padStart(3, "0");
  return `compiler/w${cat}${num}`;
};

export const mapEntryToDiagnostic = (
  entry: SuiLintEntry,
  rootDirectory: string
): Diagnostic => {
  const normalizedRelative = entry.file
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  const absolutePath = path.resolve(rootDirectory, normalizedRelative);
  return {
    ruleId: formatRuleId(entry.category, entry.code),
    severity: mapLevelToSeverity(entry.level),
    bucket: "security",
    filePath: absolutePath,
    line: entry.line,
    column: entry.column,
    message: entry.msg,
    source: "compiler",
    citation: "sui move build --lint",
  };
};

export const parseSuiLintOutput = (
  stdout: string,
  rootDirectory: string
): Diagnostic[] =>
  extractJsonArray(stdout).map((entry) =>
    mapEntryToDiagnostic(entry, rootDirectory)
  );

export const suiCliCompilerLint: CompilerLintAdapter = {
  isAvailable: isSuiOnPath,
  run: async (rootDirectory) => {
    const result = await runCommand(
      "sui",
      ["move", "build", "--lint", "--json-errors"],
      rootDirectory
    );

    const combined = `${result.stdout}\n${result.stderr}`;
    return parseSuiLintOutput(combined, rootDirectory);
  },
};
