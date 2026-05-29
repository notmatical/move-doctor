import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

// The `module::` segment of a call's callee, handling both `debug::print`
// (module field) and `std::debug::print` (a nested module_identity).
const calleeModule = (call: Node): string | null => {
  const callee = call.namedChildren.find(
    (child): child is Node => child?.type === "name_expression"
  );
  const access = callee?.childForFieldName("access");
  if (!access || access.type !== "module_access") {
    return null;
  }
  const directModule = access.childForFieldName("module");
  if (directModule) {
    return directModule.text;
  }
  const identity = access.namedChildren.find(
    (child): child is Node => child?.type === "module_identity"
  );
  return identity?.childForFieldName("module")?.text ?? null;
};

export const leftoverDebugPrint = defineAstRule({
  id: "conventions/leftover-debug-print",
  bucket: "conventions",
  severity: "warning",
  citation: "Sui Move best practice",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const call of collectNodesOfType(tree.rootNode, "call_expression")) {
      if (calleeModule(call) !== "debug") {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: leftoverDebugPrint,
          filePath: file.filePath,
          ...nodePosition(call),
          message:
            "Leftover `debug::` call — debug output should not ship in committed Move code.",
          fixHint:
            "Remove the `debug::print` / `debug::print_stack_trace` call.",
        })
      );
    }
    return diagnostics;
  },
});
