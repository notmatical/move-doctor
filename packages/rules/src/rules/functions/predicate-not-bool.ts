import type { Diagnostic } from "core";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { collectFunctions, functionName } from "../../utils/fn-ast.js";

const PREDICATE_PREFIX = /^(is|has|can)_/;

export const predicateNotBool = defineAstRule({
  id: "functions/predicate-not-bool",
  bucket: "functions",
  severity: "info",
  citation: "Move Book: Coding Conventions",
  citationUrl: "https://move-book.com/reference/coding-conventions",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      const name = functionName(fnNode);
      if (!(name && PREDICATE_PREFIX.test(name))) {
        continue;
      }
      // ret_type wraps the type after the `:`; the type itself is its first
      // named child (e.g. the `bool` primitive_type).
      const returnType =
        fnNode.childForFieldName("return_type")?.namedChildren[0]?.text ?? null;
      if (returnType === "bool") {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: predicateNotBool,
          filePath: file.filePath,
          ...nodePosition(fnNode.childForFieldName("name") ?? fnNode),
          message: `Predicate "${name}" ${returnType === null ? "returns nothing" : `returns \`${returnType}\``} — \`is_\` / \`has_\` / \`can_\` functions should return \`bool\`.`,
          fixHint:
            "Return `bool`, or rename the function so it doesn't read as a predicate.",
        })
      );
    }
    return diagnostics;
  },
});
