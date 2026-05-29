import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  callExpressionPath,
  functionName,
  isTestAnnotated,
} from "../../utils/test-ast.js";

const SCENARIO_API = new Set([
  "next_tx",
  "take_from_sender",
  "return_to_sender",
  "has_most_recent_for_sender",
  "sender",
]);

export const unnecessaryTestScenario = defineAstRule({
  id: "testing/unnecessary-test-scenario",
  bucket: "testing",
  severity: "info",
  citation: "Move Book: Do Not Use TestScenario Where Not Necessary",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#do-not-use-testscenario-where-not-necessary",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectNodesOfType(
      tree.rootNode,
      "function_definition"
    )) {
      if (!isTestAnnotated(fnNode)) {
        continue;
      }
      const body = fnNode.childForFieldName("body");
      if (!body) {
        continue;
      }
      const calls = collectNodesOfType(body, "call_expression");
      const scenarioPaths = calls
        .map((call: Node) => callExpressionPath(call))
        .filter((path) => path.module === "test_scenario");
      const usesBegin = scenarioPaths.some((path) => path.member === "begin");
      if (!usesBegin) {
        continue;
      }
      const usesApi = scenarioPaths.some(
        (path) => path.member !== null && SCENARIO_API.has(path.member)
      );
      if (usesApi) {
        continue;
      }
      const name = functionName(fnNode) ?? "";
      diagnostics.push(
        makeDiagnostic({
          rule: unnecessaryTestScenario,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Test "${name}" uses \`test_scenario\` but only to obtain a \`TxContext\`. Use \`tx_context::dummy()\` for context-only tests.`,
          fixHint:
            "Replace `let mut test = test_scenario::begin(@0);` with `let ctx = &mut tx_context::dummy();` and drop the `.end()`.",
        })
      );
    }
    return diagnostics;
  },
});
