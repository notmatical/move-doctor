import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { dotCallMethodName } from "../../utils/test-ast.js";

// `<expr>.destroy_for_testing()` — method call with no arguments.
const isDestroyForTestingCall = (node: Node): boolean => {
  if (dotCallMethodName(node) !== "destroy_for_testing") {
    return false;
  }
  const args = node.childForFieldName("access")?.childForFieldName("args");
  const argCount =
    args?.namedChildren.filter((child) => child !== null).length ?? 0;
  return argCount === 0;
};

export const useTestUtilsDestroy = defineAstRule({
  id: "testing/use-test-utils-destroy",
  bucket: "testing",
  severity: "info",
  citation: 'Move Book: Use "Black Hole" destroy Function',
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#use-black-hole-destroy-function",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const dotNode of collectNodesOfType(tree.rootNode, "dot_expression")) {
      if (!isDestroyForTestingCall(dotNode)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: useTestUtilsDestroy,
          filePath: file.filePath,
          ...nodePosition(dotNode),
          message:
            "Custom `.destroy_for_testing()` helpers are unnecessary — `sui::test_utils::destroy` handles any type.",
          fixHint:
            "Replace with `use sui::test_utils::destroy;` + `destroy(value);`.",
        })
      );
    }
    return diagnostics;
  },
});
