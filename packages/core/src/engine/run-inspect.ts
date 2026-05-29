import { readFile } from "node:fs/promises";
import { discoverProject } from "../project-info/discover-project.js";
import type {
  AstRule,
  Diagnostic,
  InspectOptions,
  InspectResult,
  ManifestRule,
  Rule,
} from "../types.js";
import { getMoveParser } from "./move-parser.js";
import { scanMoveFiles } from "./scan.js";
import { computeScore } from "./score.js";

export interface RuleSet {
  astRules?: readonly AstRule[];
  fileRules: readonly Rule[];
  manifestRules: readonly ManifestRule[];
}

export interface CompilerLintAdapter {
  isAvailable: () => Promise<boolean>;
  run: (rootDirectory: string) => Promise<Diagnostic[]>;
}

export interface RunInspectInput {
  compilerLint?: CompilerLintAdapter;
  directory: string;
  options: InspectOptions;
  rules: RuleSet;
}

export const runInspect = async (
  input: RunInspectInput
): Promise<InspectResult> => {
  const project = await discoverProject(input.directory);
  const includeTests = input.options.includeTests ?? true;
  const changedFiles = input.options.changedFiles
    ? new Set(input.options.changedFiles)
    : undefined;

  const files = await scanMoveFiles(project, { includeTests, changedFiles });

  // count actual module declarations, not just files.
  const MODULE_DECL = /^[ \t]*module\s+[A-Za-z_][\w]*::[A-Za-z_][\w]*\s*[;{]/gm;
  let moduleCount = 0;
  for (const file of files) {
    const matches = file.source.match(MODULE_DECL);
    moduleCount += matches ? matches.length : 0;
  }

  const diagnostics: Diagnostic[] = [];

  const manifestSource = await readFile(project.manifestPath, "utf8");
  for (const rule of input.rules.manifestRules) {
    diagnostics.push(...rule.scan(project, manifestSource));
  }

  for (const file of files) {
    for (const rule of input.rules.fileRules) {
      diagnostics.push(...rule.scan(file));
    }
  }

  const astRules = input.rules.astRules ?? [];
  if (astRules.length > 0 && files.length > 0) {
    // Parse each file once and share the tree across every AST rule. A missing
    // or broken grammar wasm yields a null parser → AST rules are skipped and
    // the (regex) scan above still stands.
    const parser = await getMoveParser();
    if (parser) {
      for (const file of files) {
        const tree = parser.parse(file.source);
        if (!tree) {
          continue;
        }
        try {
          for (const rule of astRules) {
            diagnostics.push(...rule.scanAst({ file, tree }));
          }
        } finally {
          tree.delete();
        }
      }
    }
  }

  let compilerLintAvailable = false;
  if (input.compilerLint) {
    compilerLintAvailable = await input.compilerLint.isAvailable();
    if (compilerLintAvailable) {
      diagnostics.push(
        ...(await input.compilerLint.run(project.rootDirectory))
      );
    }
  }

  return {
    project,
    diagnostics,
    score: computeScore(diagnostics),
    compilerLintAvailable,
    fileCount: files.length,
    moduleCount,
  };
};
