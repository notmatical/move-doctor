import type { Diagnostic, MoveFile } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

// Matches the old regex's rhs alternatives: a bare identifier, a single
// `name.method(...)` call, or an integer literal. `name.length` without a call
// (and any other shape) is intentionally not treated as an index bound.
const isIndexBound = (rhs: Node): boolean => {
  if (rhs.type === "name_expression" || rhs.type === "num_literal") {
    return true;
  }
  return (
    rhs.type === "dot_expression" &&
    rhs.childForFieldName("access")?.type === "call_expression"
  );
};

const scanWhileLoops = (file: MoveFile, root: Node): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const loop of collectNodesOfType(root, "while_expression")) {
    const condition = loop.childForFieldName("eb");
    if (!condition || condition.type !== "binary_expression") {
      continue;
    }
    if (condition.childForFieldName("operator")?.text !== "<") {
      continue;
    }
    const lhs = condition.childForFieldName("lhs");
    const rhs = condition.childForFieldName("rhs");
    if (!lhs || lhs.type !== "name_expression" || !rhs || !isIndexBound(rhs)) {
      continue;
    }
    const counterName = lhs.text;
    const upperBound = rhs.text;
    diagnostics.push(
      makeDiagnostic({
        rule: manualWhileLoop,
        filePath: file.filePath,
        ...nodePosition(loop),
        message: `Index-counter \`while (${counterName} < ${upperBound})\` loop has a macro form in Move 2024.`,
        fixHint: upperBound.includes(".length")
          ? "Use `vec.do_ref!(|x| ...)`, `vec.fold!(init, |acc, x| ...)`, or `vec.filter!(|x| ...)` depending on shape."
          : `Use \`${upperBound}.do!(|_| ...)\` for fixed-count iteration or \`vector::tabulate!(${upperBound}, |i| ...)\` to build a vector.`,
      })
    );
  }
  return diagnostics;
};

export const manualWhileLoop = defineAstRule({
  id: "macros/manual-while-loop",
  bucket: "macros",
  severity: "info",
  citation: "Move Book: Loops -> Macros",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#loops---macros",
  scanAst: ({ file, tree }) => scanWhileLoops(file, tree.rootNode),
});
