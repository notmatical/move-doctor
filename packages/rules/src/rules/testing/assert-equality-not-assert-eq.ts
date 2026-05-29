import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { isTestAnnotated, macroCallName } from "../../utils/test-ast.js";

const firstArgIsEquality = (macroNode: Node): boolean => {
  const args = macroNode.childForFieldName("args");
  const firstArg = args?.namedChildren.find((child) => child !== null) ?? null;
  if (firstArg?.type !== "binary_expression") {
    return false;
  }
  return firstArg.childForFieldName("operator")?.text === "==";
};

export const assertEqualityNotAssertEq = defineAstRule({
  id: "testing/assert-equality-not-assert-eq",
  bucket: "testing",
  severity: "info",
  citation: "Move Book: Use assert_eq! Whenever Possible",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#use-assert_eq-whenever-possible",
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
        if (!firstArgIsEquality(macroNode)) {
          continue;
        }
        diagnostics.push(
          makeDiagnostic({
            rule: assertEqualityNotAssertEq,
            filePath: file.filePath,
            ...nodePosition(macroNode),
            message:
              "Prefer `assert_eq!(left, right)` over `assert!(left == right)` — `assert_eq!` prints both values on failure.",
            fixHint: "Replace with `assert_eq!(left, right)`.",
          })
        );
      }
    }
    return diagnostics;
  },
});
