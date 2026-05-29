export interface ParsedArgs {
  /** Force workspace-wide scan even when cwd is inside a single package. */
  all: boolean;
  command: "inspect" | "install" | "help" | "version";
  diff: boolean | string;
  directory: string;
  json: boolean;
  noBanner: boolean;
  noTests: boolean;
  /** Scan a specific package by name or relative path (comma-separated). */
  packageFilter: string | null;
  scoreOnly: boolean;
  skipSetup: boolean;
  verbose: boolean;
  /** Override workspace-root detection (path). */
  workspaceOverride: string | null;
  yes: boolean;
}

const HELP_FLAGS = new Set(["-h", "--help"]);
const VERSION_FLAGS = new Set(["-v", "--version"]);

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const args: ParsedArgs = {
    directory: ".",
    verbose: false,
    diff: false,
    scoreOnly: false,
    json: false,
    noTests: false,
    noBanner: false,
    yes: false,
    skipSetup: false,
    all: false,
    packageFilter: null,
    workspaceOverride: null,
    command: "inspect",
  };

  const remaining: string[] = [];
  for (const token of argv) {
    if (HELP_FLAGS.has(token)) {
      args.command = "help";
      return args;
    }
    if (VERSION_FLAGS.has(token)) {
      args.command = "version";
      return args;
    }
    if (token === "install") {
      args.command = "install";
      continue;
    }
    if (token === "--verbose") {
      args.verbose = true;
      continue;
    }
    if (token === "--score") {
      args.scoreOnly = true;
      continue;
    }
    if (token === "--json") {
      args.json = true;
      continue;
    }
    if (token === "--no-tests") {
      args.noTests = true;
      continue;
    }
    if (token === "--no-banner") {
      args.noBanner = true;
      continue;
    }
    if (token === "--yes" || token === "-y") {
      args.yes = true;
      continue;
    }
    if (token === "--skip-setup") {
      args.skipSetup = true;
      continue;
    }
    if (token === "--all") {
      args.all = true;
      continue;
    }
    if (token.startsWith("--package=")) {
      args.packageFilter = token.slice("--package=".length);
      continue;
    }
    if (token.startsWith("--workspace=")) {
      args.workspaceOverride = token.slice("--workspace=".length);
      continue;
    }
    if (token === "--diff") {
      args.diff = true;
      continue;
    }
    if (token.startsWith("--diff=")) {
      args.diff = token.slice("--diff=".length);
      continue;
    }
    if (token.startsWith("--")) {
      throw new Error(`Unknown flag: ${token}`);
    }
    remaining.push(token);
  }

  if (remaining.length > 0) {
    const first = remaining[0];
    if (first) {
      args.directory = first;
    }
  }

  return args;
};
