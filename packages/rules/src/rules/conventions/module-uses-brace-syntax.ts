import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { scanLines } from "../../utils/line-scanner.js";

const LEGACY_MODULE_BRACE = /\bmodule\s+[A-Za-z_][\w:]*::[A-Za-z_]\w*\s*\{/g;

export const moduleUsesBraceSyntax = defineRule({
  id: "conventions/module-uses-brace-syntax",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Using Module Label",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#using-module-label",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    scanLines(file, LEGACY_MODULE_BRACE, (match) => {
      diagnostics.push(
        makeDiagnostic({
          rule: moduleUsesBraceSyntax,
          filePath: file.filePath,
          line: match.line,
          column: match.column,
          message:
            "Module declared with legacy brace syntax. Move 2024 prefers the semicolon label form.",
          fixHint:
            "Replace `module foo::bar { ... }` with `module foo::bar;` and unindent the body.",
        })
      );
    });
    return diagnostics;
  },
});
