import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { scanLines } from "../../utils/line-scanner.js";

const USE_SELF_ONLY = /\buse\s+([A-Za-z_][\w:]*)::\{\s*Self\s*\}/g;

export const useSelfOnly = defineRule({
  id: "conventions/use-self-only",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: No Single Self in use Statements",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#no-single-self-in-use-statements",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    scanLines(file, USE_SELF_ONLY, (match) => {
      const modulePath = match.groups[1] ?? "";
      diagnostics.push(
        makeDiagnostic({
          rule: useSelfOnly,
          filePath: file.filePath,
          line: match.line,
          column: match.column,
          message: "`{Self}` is redundant when no other members are imported.",
          fixHint: `Replace with \`use ${modulePath};\`.`,
        })
      );
    });
    return diagnostics;
  },
});
