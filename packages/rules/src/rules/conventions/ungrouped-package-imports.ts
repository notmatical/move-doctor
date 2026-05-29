import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { forEachCodeLine } from "../../utils/line-scanner.js";

// Matches the *start* of any `use` statement and captures the top-level
// package. This intentionally only looks at the first line of a use block —
// a multi-line grouped use like `use sui::{\n  clock::Clock,\n  coin::Coin\n};`
// matches exactly once on its first line.
const USE_START = /\buse\s+([A-Za-z_]\w*)::/;

interface FirstSeen {
  column: number;
  line: number;
}

export const ungroupedPackageImports = defineRule({
  id: "conventions/ungrouped-package-imports",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Group use Statements with Self",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#group-use-statements-with-self",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    const seen = new Map<string, FirstSeen>();
    forEachCodeLine(file, (line, lineNumber) => {
      const match = USE_START.exec(line);
      if (!match) {
        return;
      }
      const pkg = match[1];
      if (!pkg) {
        return;
      }
      const column = (match.index ?? 0) + 1;
      const prior = seen.get(pkg);
      if (!prior) {
        seen.set(pkg, { line: lineNumber, column });
        return;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: ungroupedPackageImports,
          filePath: file.filePath,
          line: lineNumber,
          column,
          message: `Multiple \`use\` statements import from package "${pkg}" (first at line ${prior.line}). Move 2024 prefers a single grouped import per package.`,
          fixHint: `Combine all \`use ${pkg}::*\` lines into a single \`use ${pkg}::{...};\` block.`,
        })
      );
    });
    return diagnostics;
  },
});
