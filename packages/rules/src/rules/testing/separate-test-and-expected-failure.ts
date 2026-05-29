import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { precedingAnnotations } from "../../utils/test-ast.js";

const annotationItemNames = (annotation: Node): string[] => {
  const names: string[] = [];
  for (const item of annotation.namedChildren) {
    if (item?.type !== "annotation_item") {
      continue;
    }
    const expr = item.childForFieldName("annotation_expr");
    const list = item.childForFieldName("annotation_list");
    const name =
      expr?.childForFieldName("name")?.text ??
      list?.childForFieldName("name")?.text ??
      null;
    if (name) {
      names.push(name);
    }
  }
  return names;
};

export const separateTestAndExpectedFailure = defineAstRule({
  id: "testing/separate-test-and-expected-failure",
  bucket: "testing",
  severity: "info",
  citation: "Move Book: Merge #[test] and #[expected_failure(...)]",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#merge-test-and-expected_failure",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectNodesOfType(
      tree.rootNode,
      "function_definition"
    )) {
      const annotations = precedingAnnotations(fnNode);
      const testAnnotation = annotations.find((annotation) =>
        annotationItemNames(annotation).includes("test")
      );
      const failureAnnotation = annotations.find((annotation) =>
        annotationItemNames(annotation).includes("expected_failure")
      );
      // Both present but in *separate* annotation nodes — the combined
      // `#[test, expected_failure(...)]` form lives in a single node.
      if (
        !(testAnnotation && failureAnnotation) ||
        testAnnotation === failureAnnotation
      ) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: separateTestAndExpectedFailure,
          filePath: file.filePath,
          ...nodePosition(testAnnotation),
          message:
            "`#[test]` and `#[expected_failure(...)]` should be combined into one attribute line.",
          fixHint: "Merge into `#[test, expected_failure(abort_code = ...)]`.",
        })
      );
    }
    return diagnostics;
  },
});
