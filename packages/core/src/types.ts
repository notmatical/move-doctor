export type Severity = "error" | "warning" | "info";

export type RuleBucket =
  | "conventions"
  | "functions"
  | "idioms"
  | "macros"
  | "testing"
  | "abilities"
  | "security"
  | "gas";

export type DiagnosticSource = "compiler" | "move-doctor";

export interface Diagnostic {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  column: number;
  filePath: string;
  fixHint?: string;
  line: number;
  message: string;
  ruleId: string;
  severity: Severity;
  source: DiagnosticSource;
}

export interface MoveFile {
  filePath: string;
  lines: string[];
  source: string;
}

export interface ProjectInfo {
  edition: string | null;
  manifestPath: string;
  packageName: string;
  rootDirectory: string;
}

export interface Rule {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  id: string;
  scan: (file: MoveFile) => Diagnostic[];
  severity: Severity;
}

export interface AstRuleContext {
  file: MoveFile;
  // tree-sitter `Tree`; typed loosely so `core/types` stays free of a hard
  // dependency on the web-tree-sitter type surface. AST rules narrow as needed.
  tree: import("web-tree-sitter").Tree;
}

// AST-backed rule. The engine parses each file once (lazily, only when AST
// rules are present and the grammar loads) and hands the shared tree to every
// AST rule. Mirrors `Rule` but receives a parsed tree instead of raw text.
export interface AstRule {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  id: string;
  scanAst: (context: AstRuleContext) => Diagnostic[];
  severity: Severity;
}

export interface ManifestRule {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  id: string;
  scan: (project: ProjectInfo, manifestSource: string) => Diagnostic[];
  severity: Severity;
}

export interface InspectOptions {
  changedFiles?: string[];
  diff?: boolean;
  includeTests?: boolean;
  json?: boolean;
  scoreOnly?: boolean;
  verbose?: boolean;
}

export interface ScoreResult {
  byBucket: Partial<Record<RuleBucket, number>>;
  bySeverity: Record<Severity, number>;
  deductions: number;
  score: number;
  totalFindings: number;
}

export interface InspectResult {
  compilerLintAvailable: boolean;
  diagnostics: Diagnostic[];
  /** Number of .move files actually scanned (after diff/test filtering). */
  fileCount: number;
  /** Number of `module` declarations across the scanned files. */
  moduleCount: number;
  project: ProjectInfo;
  score: ScoreResult;
}

export interface PackageScanResult extends InspectResult {
  /** Path relative to the workspace root (POSIX slashes). */
  relativePath: string;
  skipped?: { reason: "no-changed-files" };
}

export interface WorkspaceInspectResult {
  /**
   * Aggregate score using worst-package-wins semantics: the minimum score
   * across all scored packages. Score is a quality gate, not a portfolio
   * metric — averaging would let a clean package mask a critical one.
   */
  aggregateScore: ScoreResult;
  /** True when every scoped package had Sui CLI lints available. */
  compilerLintAvailable: boolean;
  /** Sum of every package's diagnostics — easy for top-fixes / JSON output. */
  diagnostics: Diagnostic[];
  /** All scanned packages, in the order they were processed. */
  perPackage: PackageScanResult[];
  /** Packages that ran a scan and produced findings. */
  scannedPackageCount: number;
  /** Packages we skipped (e.g. diff mode and no changed files in them). */
  skippedPackageCount: number;
}
