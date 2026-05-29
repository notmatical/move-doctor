import type { Diagnostic } from "core";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  isEntry,
  isPublic,
} from "../../utils/fn-ast.js";

export const publicEntryCombined = defineAstRule({
  id: "functions/public-entry-combined",
  bucket: "functions",
  severity: "info",
  citation: "Move Book: No public entry, Only public or entry",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#no-public-entry-only-public-or-entry",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      if (!(isPublic(fnNode) && isEntry(fnNode))) {
        continue;
      }
      const name = functionName(fnNode);
      if (!name) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: publicEntryCombined,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Function "${name}" is declared \`public entry\`. \`entry\` is unnecessary on a public function — PTBs can call it either way, and dropping \`entry\` allows return values.`,
          fixHint: `Remove \`entry\` from the declaration: \`public fun ${name}(...)\`.`,
        })
      );
    }
    return diagnostics;
  },
});
