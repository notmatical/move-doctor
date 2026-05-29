import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { scanLines } from "../../utils/line-scanner.js";

const UNPACK_WITH_UNDERSCORE =
  /\blet\s+(?:mut\s+)?[A-Z][\w]*\s*\{[^{}\n]*?[A-Za-z_]\w*\s*:\s*_[^{}\n]*?\}/g;

export const unpackExplicitUnderscoreFields = defineRule({
  id: "conventions/unpack-explicit-underscore-fields",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Ignored Values In Unpack Can Be Ignored Altogether",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#ignored-values-in-unpack-can-be-ignored-altogether",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    scanLines(file, UNPACK_WITH_UNDERSCORE, (match) => {
      diagnostics.push(
        makeDiagnostic({
          rule: unpackExplicitUnderscoreFields,
          filePath: file.filePath,
          line: match.line,
          column: match.column,
          message:
            "Unpack pattern ignores fields with `field: _`. Move 2024 lets you drop them entirely with `..`.",
          fixHint:
            "Replace the explicit `: _` fields with a single `..` at the end of the pattern.",
        })
      );
    });
    return diagnostics;
  },
});
