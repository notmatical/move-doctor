import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  callExpressionPath,
  dotCallMethodName,
  functionName,
  hasExpectedFailure,
} from "../../utils/test-ast.js";

// `x.end()` — method-call cleanup with no arguments.
const isDotEndCall = (node: Node): boolean => {
  if (node.type !== "dot_expression" || dotCallMethodName(node) !== "end") {
    return false;
  }
  const args = node.childForFieldName("access")?.childForFieldName("args");
  const argCount =
    args?.namedChildren.filter((child) => child !== null).length ?? 0;
  return argCount === 0;
};

// `test_scenario::end(...)` — module-qualified cleanup with any arguments.
const isScenarioEndCall = (node: Node): boolean => {
  if (node.type !== "call_expression") {
    return false;
  }
  const { module, member } = callExpressionPath(node);
  return module === "test_scenario" && member === "end";
};

const hasCleanup = (fnNode: Node): boolean => {
  const body = fnNode.childForFieldName("body");
  if (!body) {
    return false;
  }
  const dotCalls = collectNodesOfType(body, "dot_expression");
  if (dotCalls.some(isDotEndCall)) {
    return true;
  }
  const calls = collectNodesOfType(body, "call_expression");
  return calls.some(isScenarioEndCall);
};

export const cleanupInExpectedFailure = defineAstRule({
  id: "testing/cleanup-in-expected-failure",
  bucket: "testing",
  severity: "info",
  citation: "Move Book: Do Not Clean Up expected_failure Tests",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#do-not-clean-up-expected_failure-tests",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectNodesOfType(
      tree.rootNode,
      "function_definition"
    )) {
      if (!hasExpectedFailure(fnNode)) {
        continue;
      }
      if (!hasCleanup(fnNode)) {
        continue;
      }
      const name = functionName(fnNode) ?? "";
      diagnostics.push(
        makeDiagnostic({
          rule: cleanupInExpectedFailure,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Test "${name}" is marked \`#[expected_failure]\` but still calls cleanup (e.g. \`test.end()\`). The test will abort before cleanup runs — drop the cleanup so the failure point is obvious.`,
          fixHint:
            "Remove the `.end()` / `test_scenario::end` call; replace with a bare `abort` or expected-failing call.",
        })
      );
    }
    return diagnostics;
  },
});
