import type { Diagnostic, MoveFile } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

// The member identifier of a `receiver.method(...)` dot-call, or null when the
// node is not that shape.
const calledMethod = (dot: Node): string | null => {
  if (dot.type !== "dot_expression") {
    return null;
  }
  const access = dot.childForFieldName("access");
  if (!access || access.type !== "call_expression") {
    return null;
  }
  // The callee `name_expression` is the call's first named child (not a field).
  const nameExpr = access.namedChildren.find(
    (child): child is Node => child?.type === "name_expression"
  );
  return (
    nameExpr?.childForFieldName("access")?.childForFieldName("member")?.text ??
    null
  );
};

const scanDestroyLoops = (file: MoveFile, root: Node): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const loop of collectNodesOfType(root, "while_expression")) {
    const condition = loop.childForFieldName("eb");
    if (!condition || condition.type !== "unary_expression") {
      continue;
    }
    if (condition.childForFieldName("op")?.text !== "!") {
      continue;
    }
    const inner = condition.childForFieldName("expr");
    if (!inner || calledMethod(inner) !== "is_empty") {
      continue;
    }
    const receiver = inner.childForFieldName("expr");
    if (!receiver || receiver.type !== "name_expression") {
      continue;
    }
    const vectorName = receiver.text;
    diagnostics.push(
      makeDiagnostic({
        rule: manualVectorDestroyLoop,
        filePath: file.filePath,
        ...nodePosition(loop),
        message: `\`while (!${vectorName}.is_empty())\` drain loop has a macro form in Move 2024.`,
        fixHint: `Use \`${vectorName}.destroy!(|element| ...)\` to consume each element.`,
      })
    );
  }
  return diagnostics;
};

export const manualVectorDestroyLoop = defineAstRule({
  id: "macros/manual-vector-destroy-loop",
  bucket: "macros",
  severity: "info",
  citation: "Move Book: Destroy a Vector and Call a Function on Each Element",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#destroy-a-vector-and-call-a-function-on-each-element",
  scanAst: ({ file, tree }) => scanDestroyLoops(file, tree.rootNode),
});
