import type { Diagnostic } from "core";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const METHOD_NAMES = new Set(["get", "get_mut"]);

export const getOrGetMutOnCollection = defineAstRule({
  id: "idioms/get-or-get-mut-on-collection",
  bucket: "idioms",
  severity: "info",
  citation: "Move Book: Collections Support Index Syntax",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#collections-support-index-syntax",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const dot of collectNodesOfType(tree.rootNode, "dot_expression")) {
      const call = dot.childForFieldName("access");
      if (call?.type !== "call_expression") {
        continue;
      }
      const member = call.namedChildren[0]
        ?.childForFieldName("access")
        ?.childForFieldName("member")?.text;
      if (!(member && METHOD_NAMES.has(member))) {
        continue;
      }
      // The regex only fired when the first argument was a reference (`&key`),
      // i.e. a collection lookup by borrowed key. Preserve that: require the
      // first arg to be a borrow_expression.
      const firstArg = call.childForFieldName("args")?.namedChildren[0];
      if (firstArg?.type !== "borrow_expression") {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: getOrGetMutOnCollection,
          filePath: file.filePath,
          ...nodePosition(dot),
          message: `\`.${member}(&key)\` on a collection has an index-syntax form in Move 2024.`,
          fixHint:
            member === "get_mut"
              ? "Prefer `&mut x[&key]`."
              : "Prefer `&x[&key]`.",
        })
      );
    }
    return diagnostics;
  },
});
