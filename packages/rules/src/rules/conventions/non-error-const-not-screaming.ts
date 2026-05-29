import type { Diagnostic } from "core";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const SCREAMING_SNAKE = /^[A-Z][A-Z0-9_]*$/;

export const nonErrorConstNotScreaming = defineAstRule({
  id: "conventions/non-error-const-not-screaming",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Regular Constant are ALL_CAPS",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#regular-constant-are-all_caps",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const constant of collectNodesOfType(tree.rootNode, "constant")) {
      const nameNode = constant.childForFieldName("name");
      const name = nameNode?.text;
      if (!name) {
        continue;
      }
      // Error constants (`E` + uppercase) are governed by a separate rule.
      if (name.startsWith("E") && /^E[A-Z]/.test(name)) {
        continue;
      }
      if (SCREAMING_SNAKE.test(name)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: nonErrorConstNotScreaming,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? constant),
          message: `Constant "${name}" should use SCREAMING_SNAKE_CASE.`,
          fixHint:
            "Rename to match `/^[A-Z][A-Z0-9_]*$/` (e.g. `MY_CONSTANT`).",
        })
      );
    }
    return diagnostics;
  },
});
