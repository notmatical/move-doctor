import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { isTestAnnotated, macroCallName } from "../../utils/test-ast.js";

// `assert!(condition, <code>)` — exactly two args, the second a numeric literal.
const hasNumericAbortCode = (macroNode: Node): boolean => {
  const args = macroNode.childForFieldName("args");
  const namedArgs =
    args?.namedChildren.filter((child): child is Node => child !== null) ?? [];
  if (namedArgs.length !== 2) {
    return false;
  }
  return namedArgs[1]?.type === "num_literal";
};

export const assertWithAbortCodeInTest = defineAstRule({
  id: "testing/assert-with-abort-code-in-test",
  bucket: "testing",
  severity: "info",
  citation: "Move Book: Do Not Use Abort Codes in assert! in Tests",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#do-not-use-abort-codes-in-assert-in-tests",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectNodesOfType(
      tree.rootNode,
      "function_definition"
    )) {
      if (!isTestAnnotated(fnNode)) {
        continue;
      }
      for (const macroNode of collectNodesOfType(
        fnNode,
        "macro_call_expression"
      )) {
        if (macroCallName(macroNode) !== "assert") {
          continue;
        }
        if (!hasNumericAbortCode(macroNode)) {
          continue;
        }
        diagnostics.push(
          makeDiagnostic({
            rule: assertWithAbortCodeInTest,
            filePath: file.filePath,
            ...nodePosition(macroNode),
            message:
              "Tests should not pass an abort code to `assert!` — it can collide with application error codes.",
            fixHint:
              "Drop the abort code: `assert!(condition)` or use `assert_eq!(a, b)`.",
          })
        );
      }
    }
    return diagnostics;
  },
});
