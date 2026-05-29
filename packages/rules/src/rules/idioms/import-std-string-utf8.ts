import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { scanLines } from "../../utils/line-scanner.js";

const UTF8_IMPORT_DIRECT = /\buse\s+std::string::utf8\s*;/g;
const UTF8_IMPORT_BRACED = /\buse\s+std::string::\{[^}]*\butf8\b[^}]*\}/g;

export const importStdStringUtf8 = defineRule({
  id: "idioms/import-std-string-utf8",
  bucket: "idioms",
  severity: "info",
  citation: "Move Book: Do Not Import std::string::utf8",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#do-not-import-stdstringutf8",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    for (const pattern of [UTF8_IMPORT_DIRECT, UTF8_IMPORT_BRACED]) {
      scanLines(file, pattern, (match) => {
        diagnostics.push(
          makeDiagnostic({
            rule: importStdStringUtf8,
            filePath: file.filePath,
            line: match.line,
            column: match.column,
            message:
              "Importing `std::string::utf8` is unnecessary in Move 2024 — byte literals have `.to_string()` directly.",
            fixHint:
              'Remove the import and call `b"...".to_string()` (or `.to_ascii_string()`).',
          })
        );
      });
    }
    return diagnostics;
  },
});
