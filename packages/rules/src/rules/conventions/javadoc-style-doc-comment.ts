import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { offsetToLineColumn } from "../../utils/line-scanner.js";

const JAVADOC_BLOCK = /\/\*\*[\s\S]*?\*\//g;

export const javadocStyleDocComment = defineRule({
  id: "conventions/javadoc-style-doc-comment",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Doc Comments Start With ///",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#doc-comments-start-with-",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    JAVADOC_BLOCK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = JAVADOC_BLOCK.exec(file.source)) !== null) {
      const { line, column } = offsetToLineColumn(file.source, match.index);
      diagnostics.push(
        makeDiagnostic({
          rule: javadocStyleDocComment,
          filePath: file.filePath,
          line,
          column,
          message:
            "JavaDoc-style /** */ comments aren't rendered by docgen. Use triple-slash /// doc comments.",
          fixHint: "Replace /** ... */ with /// on each line.",
        })
      );
    }
    return diagnostics;
  },
});
