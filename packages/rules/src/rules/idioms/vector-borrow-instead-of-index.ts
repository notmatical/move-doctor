import type { Diagnostic } from "core";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

export const vectorBorrowInsteadOfIndex = defineAstRule({
  id: "idioms/vector-borrow-instead-of-index",
  bucket: "idioms",
  severity: "info",
  citation: "Move Book: Collections Support Index Syntax",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#collections-support-index-syntax",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const call of collectNodesOfType(tree.rootNode, "call_expression")) {
      const access = call.namedChildren[0]?.childForFieldName("access");
      if (access?.type !== "module_access") {
        continue;
      }
      if (access.childForFieldName("module")?.text !== "vector") {
        continue;
      }
      const member = access.childForFieldName("member")?.text;
      if (member !== "borrow" && member !== "borrow_mut") {
        continue;
      }
      const isMutable = member === "borrow_mut";
      diagnostics.push(
        makeDiagnostic({
          rule: vectorBorrowInsteadOfIndex,
          filePath: file.filePath,
          ...nodePosition(call),
          message: `\`vector::borrow${isMutable ? "_mut" : ""}\` has an index-syntax form in Move 2024.`,
          fixHint: isMutable ? "Use `&mut v[index]`." : "Use `&v[index]`.",
        })
      );
    }
    return diagnostics;
  },
});
