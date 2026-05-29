import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  functionParams,
  modifierTexts,
} from "../../utils/fn-ast.js";

const hasVisibility = (fnNode: Node): boolean =>
  modifierTexts(fnNode).some(
    (modifier) => modifier === "entry" || modifier.startsWith("public")
  );

// The Sui module initializer is `fun init(ctx: &mut TxContext)` or
// `fun init(otw, ctx: &mut TxContext)` — always private, last param a
// `TxContext`. We only flag functions matching that shape so an unrelated
// helper that happens to be named `init` isn't a false positive.
const looksLikeInitializer = (fnNode: Node): boolean => {
  if (functionName(fnNode) !== "init") {
    return false;
  }
  const params = functionParams(fnNode);
  if (params.length < 1 || params.length > 2) {
    return false;
  }
  return params.at(-1)?.type.includes("TxContext") ?? false;
};

export const initNotPrivate = defineAstRule({
  id: "security/init-not-private",
  bucket: "security",
  severity: "warning",
  citation: "Move Book: Module Initializer",
  citationUrl: "https://move-book.com/programmability/module-initializer",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      if (!(looksLikeInitializer(fnNode) && hasVisibility(fnNode))) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: initNotPrivate,
          filePath: file.filePath,
          ...nodePosition(fnNode.childForFieldName("name") ?? fnNode),
          message:
            "Module initializer `init` must be private — a `public`/`entry` `init` lets anyone re-run initialization.",
          fixHint:
            "Drop the `public`/`entry` modifier so `init` is module-private; Sui still calls it once at publish.",
        })
      );
    }
    return diagnostics;
  },
});
