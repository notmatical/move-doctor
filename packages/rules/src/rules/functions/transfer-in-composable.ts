import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import {
  collectNodesOfType,
  fieldText,
  nodePosition,
} from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  isEntry,
  isPublic,
} from "../../utils/fn-ast.js";

const callsTransferTransfer = (body: Node): boolean =>
  collectNodesOfType(body, "call_expression").some((call) => {
    const callee = call.namedChildren.find(
      (child): child is Node => child?.type === "name_expression"
    );
    const access = callee?.childForFieldName("access");
    if (!access || access.type !== "module_access") {
      return false;
    }
    return (
      fieldText(access, "module") === "transfer" &&
      fieldText(access, "member") === "transfer"
    );
  });

export const transferInComposable = defineAstRule({
  id: "functions/transfer-in-composable",
  bucket: "functions",
  severity: "info",
  citation: "Move Book: Write Composable Functions for PTBs",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#write-composable-functions-for-ptbs",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      if (!isPublic(fnNode) || isEntry(fnNode)) {
        continue;
      }
      const body = fnNode.childForFieldName("body");
      if (!(body && callsTransferTransfer(body))) {
        continue;
      }
      const name = functionName(fnNode);
      if (!name) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: transferInComposable,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Composable function "${name}" calls transfer::transfer. Composable functions should return objects so PTBs can chain them; do the transfer in a separate \`entry\` wrapper.`,
          fixHint: `Return the object from "${name}" and move the \`transfer::transfer\` call to a dedicated \`entry\` function.`,
        })
      );
    }
    return diagnostics;
  },
});
