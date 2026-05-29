import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { collectFunctions, functionName } from "../../utils/fn-ast.js";

// The member name of an UNqualified call (`foo(...)`), or null for qualified
// (`other::foo(...)`) or non-path calls. Only unqualified calls can be a
// self-call within the same module.
const localCallName = (call: Node): string | null => {
  const callee = call.namedChildren.find(
    (child): child is Node => child?.type === "name_expression"
  );
  const access = callee?.childForFieldName("access");
  if (!access || access.type !== "module_access") {
    return null;
  }
  if (access.childForFieldName("module")) {
    return null;
  }
  return access.childForFieldName("member")?.text ?? null;
};

export const recursiveFunctionCall = defineAstRule({
  id: "functions/recursive-function-call",
  bucket: "functions",
  severity: "warning",
  citation: "Sui Move best practice",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      const name = functionName(fnNode);
      const body = fnNode.childForFieldName("body");
      if (!(name && body)) {
        continue;
      }
      const callsItself = collectNodesOfType(body, "call_expression").some(
        (call) => localCallName(call) === name
      );
      if (!callsItself) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: recursiveFunctionCall,
          filePath: file.filePath,
          ...nodePosition(fnNode.childForFieldName("name") ?? fnNode),
          message: `Function "${name}" calls itself. Move has no tail-call optimization and favors iteration; accidental or unbounded recursion aborts at runtime (a recurring always-aborts bug).`,
          fixHint:
            "Confirm a base case bounds the recursion, or rewrite it with a loop / `do!` macro. If the self-call was a typo for another function, fix the callee.",
        })
      );
    }
    return diagnostics;
  },
});
