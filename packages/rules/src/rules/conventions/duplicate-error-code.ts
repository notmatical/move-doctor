import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import {
  collectNodesOfType,
  fieldText,
  nodePosition,
} from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const ERROR_CONST = /^E[A-Z]/;

// Normalize a numeric literal to a comparable value: drop `_` separators and a
// trailing type suffix, then parse (BigInt handles decimal + `0x` hex). Returns
// null for non-literal exprs (computed values) — we only compare literals.
const literalValue = (text: string): string | null => {
  const cleaned = text
    .replace(/_/g, "")
    .replace(/(u8|u16|u32|u64|u128|u256)$/i, "");
  try {
    return BigInt(cleaned).toString();
  } catch {
    return null;
  }
};

export const duplicateErrorCode = defineAstRule({
  id: "conventions/duplicate-error-code",
  bucket: "conventions",
  severity: "warning",
  citation: "Move Book: Aborting Execution",
  citationUrl: "https://move-book.com/move-basics/assert-and-abort",
  scanAst: ({ file, tree }) => {
    // Group error consts by literal value; any value with 2+ error consts is a
    // collision — those aborts become indistinguishable at the call site.
    const byValue = new Map<string, Node[]>();
    for (const constant of collectNodesOfType(tree.rootNode, "constant")) {
      const name = fieldText(constant, "name");
      if (!(name && ERROR_CONST.test(name))) {
        continue;
      }
      const expr = constant.childForFieldName("expr");
      if (!expr || expr.type !== "num_literal") {
        continue;
      }
      const value = literalValue(expr.text);
      if (value === null) {
        continue;
      }
      const group = byValue.get(value) ?? [];
      group.push(constant);
      byValue.set(value, group);
    }

    const diagnostics: Diagnostic[] = [];
    for (const group of byValue.values()) {
      if (group.length < 2) {
        continue;
      }
      const names = group
        .map((node) => node.childForFieldName("name")?.text)
        .filter(Boolean)
        .join(", ");
      for (const constant of group) {
        const nameNode = constant.childForFieldName("name");
        diagnostics.push(
          makeDiagnostic({
            rule: duplicateErrorCode,
            filePath: file.filePath,
            ...nodePosition(nameNode ?? constant),
            message: `Error constants share the same abort code (${names}) — aborts are indistinguishable at the call site.`,
            fixHint: "Give each error constant a unique value.",
          })
        );
      }
    }
    return diagnostics;
  },
});
