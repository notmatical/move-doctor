import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { forEachCodeLine } from "../../utils/line-scanner.js";

const USE_STATEMENT =
  /\buse\s+([A-Za-z_][\w]*(?:::[A-Za-z_][\w]*)+)(?:::\{[^}]*\})?\s*;/;

interface FirstSeen {
  column: number;
  line: number;
}

const moduleKeyFor = (fullPath: string): string => {
  // A `use` path is `address::module` (2 segments) or `address::module::member`
  // (3 segments). We dedupe by the first two segments so
  // `use sui::table;` and `use sui::table::Table;` collapse to the same key.
  const segments = fullPath.split("::");
  if (segments.length <= 2) {
    return fullPath;
  }
  return segments.slice(0, 2).join("::");
};

export const useSplitImport = defineRule({
  id: "conventions/use-split-import",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Group use Statements with Self",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#group-use-statements-with-self",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    const seen = new Map<string, FirstSeen>();
    forEachCodeLine(file, (line, lineNumber) => {
      const match = USE_STATEMENT.exec(line);
      if (!match) {
        return;
      }
      const fullPath = match[1] ?? "";
      const moduleKey = moduleKeyFor(fullPath);
      const column = (match.index ?? 0) + 1;
      const prior = seen.get(moduleKey);
      if (!prior) {
        seen.set(moduleKey, { line: lineNumber, column });
        return;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: useSplitImport,
          filePath: file.filePath,
          line: lineNumber,
          column,
          message: `Module "${moduleKey}" is imported on multiple lines (first at line ${prior.line}). Group into one \`use\` statement.`,
          fixHint: `Combine with the earlier import: \`use ${moduleKey}::{Self, OtherMember};\`.`,
        })
      );
    });
    return diagnostics;
  },
});
