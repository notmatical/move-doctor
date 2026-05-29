import type { Diagnostic } from "core";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { functionName, isTestAnnotated } from "../../utils/test-ast.js";

const isInTestsModule = (filePath: string): boolean =>
  /(?:_tests\.move|[/\\]tests[/\\][^/\\]+\.move)$/.test(filePath);

export const testPrefixInTestsModule = defineAstRule({
  id: "testing/test-prefix-in-tests-module",
  bucket: "testing",
  severity: "info",
  citation: "Move Book: Do Not Prefix Tests With test_ in Testing Modules",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#do-not-prefix-tests-with-test_-in-testing-modules",
  scanAst: ({ file, tree }) => {
    if (!isInTestsModule(file.filePath)) {
      return [];
    }
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectNodesOfType(
      tree.rootNode,
      "function_definition"
    )) {
      if (!isTestAnnotated(fnNode)) {
        continue;
      }
      const name = functionName(fnNode);
      if (!name?.startsWith("test_")) {
        continue;
      }
      const suggested = name.replace(/^test_/, "");
      diagnostics.push(
        makeDiagnostic({
          rule: testPrefixInTestsModule,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Test "${name}" lives in a tests module; the \`test_\` prefix is redundant.`,
          fixHint: `Rename to "${suggested}".`,
        })
      );
    }
    return diagnostics;
  },
});
