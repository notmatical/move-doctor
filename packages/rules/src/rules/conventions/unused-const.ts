import type { Diagnostic } from "core";
import {
  collectNodesOfType,
  fieldText,
  nodePosition,
} from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

export const unusedConst = defineAstRule({
  id: "conventions/unused-const",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Constants",
  citationUrl: "https://move-book.com/move-basics/constants",
  scanAst: ({ file, tree }) => {
    // Move constants are module-private, so a file-local reference scan is
    // sound: a const referenced nowhere in its module is dead. The declaration
    // name is a `constant_identifier`; every *use* is a plain `identifier`, so
    // a const whose name never appears as an `identifier` is unused.
    const referenced = new Set(
      collectNodesOfType(tree.rootNode, "identifier").map((node) => node.text)
    );

    const diagnostics: Diagnostic[] = [];
    for (const constant of collectNodesOfType(tree.rootNode, "constant")) {
      const nameNode = constant.childForFieldName("name");
      const name = fieldText(constant, "name");
      if (!name || referenced.has(name)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: unusedConst,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? constant),
          message: `Constant "${name}" is declared but never used.`,
          fixHint: "Remove it, or reference it where intended.",
        })
      );
    }
    return diagnostics;
  },
});
