import type { Diagnostic } from "core";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const EPASCAL_CASE = /^E[A-Z][A-Za-z0-9]*$/;

export const errorConstNotEpascalcase = defineAstRule({
  id: "conventions/error-const-not-epascalcase",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Error Constants are in EPascalCase",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#error-constants-are-in-epascalcase",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const constant of collectNodesOfType(tree.rootNode, "constant")) {
      const nameNode = constant.childForFieldName("name");
      const name = nameNode?.text;
      // Error constants are those whose name starts with `E`, matching the
      // original `\bconst\s+(E[A-Za-z0-9_]*)` classification.
      if (!(name && /^E[A-Za-z0-9_]*$/.test(name))) {
        continue;
      }
      if (EPASCAL_CASE.test(name)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: errorConstNotEpascalcase,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? constant),
          message: `Error constant "${name}" should use EPascalCase (e.g. ENotAuthorized).`,
          fixHint: "Rename to match `/^E[A-Z][A-Za-z0-9]*$/`.",
        })
      );
    }
    return diagnostics;
  },
});
