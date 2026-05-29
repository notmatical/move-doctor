import type { Diagnostic } from "core";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

export const manualOptionUnwrap = defineAstRule({
  id: "idioms/manual-option-unwrap",
  bucket: "idioms",
  severity: "info",
  citation: "Move Book: Option -> Macros",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#option---macros",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const ifExpr of collectNodesOfType(tree.rootNode, "if_expression")) {
      const condition = ifExpr.childForFieldName("eb");
      if (condition?.type !== "dot_expression") {
        continue;
      }
      const receiver = condition.childForFieldName("expr");
      // The regex matched `if (<ident>.is_some())` — a bare variable receiver.
      if (receiver?.type !== "name_expression") {
        continue;
      }
      const call = condition.childForFieldName("access");
      if (call?.type !== "call_expression") {
        continue;
      }
      const member = call.namedChildren[0]
        ?.childForFieldName("access")
        ?.childForFieldName("member")?.text;
      if (member !== "is_some") {
        continue;
      }
      const args = call.childForFieldName("args");
      if ((args?.namedChildren.length ?? 0) !== 0) {
        continue;
      }
      const optionName = receiver.text;
      diagnostics.push(
        makeDiagnostic({
          rule: manualOptionUnwrap,
          filePath: file.filePath,
          ...nodePosition(ifExpr),
          message: `Manual \`if (${optionName}.is_some())\` unwrap has macro forms in Move 2024.`,
          fixHint: `Use \`${optionName}.do!(|value| ...)\` to consume on Some, or \`${optionName}.destroy_or!(default)\` to fall back to a default.`,
        })
      );
    }
    return diagnostics;
  },
});
