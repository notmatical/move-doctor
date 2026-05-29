import type {
  AstRule,
  AstRuleContext,
  Diagnostic,
  ManifestRule,
  MoveFile,
  ProjectInfo,
  Rule,
  RuleBucket,
  Severity,
} from "core";

interface DefineRuleInput {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  id: string;
  scan: (file: MoveFile) => Diagnostic[];
  severity: Severity;
}

interface DefineAstRuleInput {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  id: string;
  scanAst: (context: AstRuleContext) => Diagnostic[];
  severity: Severity;
}

interface DefineManifestRuleInput {
  bucket: RuleBucket;
  citation?: string;
  citationUrl?: string;
  id: string;
  scan: (project: ProjectInfo, manifestSource: string) => Diagnostic[];
  severity: Severity;
}

export const defineRule = (input: DefineRuleInput): Rule => input;

export const defineAstRule = (input: DefineAstRuleInput): AstRule => input;

export const defineManifestRule = (
  input: DefineManifestRuleInput
): ManifestRule => input;

interface MakeDiagnosticInput {
  column?: number;
  filePath: string;
  fixHint?: string;
  line: number;
  message: string;
  rule: Pick<
    Rule | ManifestRule,
    "id" | "bucket" | "severity" | "citation" | "citationUrl"
  >;
}

export const makeDiagnostic = (input: MakeDiagnosticInput): Diagnostic => ({
  ruleId: input.rule.id,
  severity: input.rule.severity,
  bucket: input.rule.bucket,
  filePath: input.filePath,
  line: input.line,
  column: input.column ?? 1,
  message: input.message,
  fixHint: input.fixHint,
  source: "move-doctor",
  citation: input.rule.citation,
  citationUrl: input.rule.citationUrl,
});
