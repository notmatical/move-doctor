import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  isPublic,
} from "../../utils/fn-ast.js";

const isUid = (type: string): boolean =>
  type === "UID" || type.endsWith("::UID");

// A `return_type` of `&mut UID`: ret_type → ref_type(mut_ref, <type>).
const returnsMutUid = (fnNode: Node): boolean => {
  const ret = fnNode.childForFieldName("return_type");
  const refType = ret?.namedChildren.find(
    (child): child is Node => child?.type === "ref_type"
  );
  if (!refType) {
    return false;
  }
  const hasMut = refType.namedChildren.some(
    (child) => child?.type === "mut_ref"
  );
  const typeNode = refType.namedChildren.find(
    (child): child is Node =>
      child?.type !== "mut_ref" && child?.type !== "imm_ref"
  );
  return hasMut && typeNode !== undefined && isUid(typeNode.text);
};

export const mutUidAccessorLeak = defineAstRule({
  id: "security/mut-uid-accessor-leak",
  bucket: "security",
  severity: "warning",
  citation: "Move Book: UID and ID",
  citationUrl: "https://move-book.com/storage/uid-and-id",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      if (!(isPublic(fnNode) && returnsMutUid(fnNode))) {
        continue;
      }
      const name = functionName(fnNode) ?? "function";
      diagnostics.push(
        makeDiagnostic({
          rule: mutUidAccessorLeak,
          filePath: file.filePath,
          ...nodePosition(fnNode.childForFieldName("name") ?? fnNode),
          message: `Public "${name}" returns \`&mut UID\` — callers can add, remove, or mutate dynamic fields on the object, bypassing module invariants.`,
          fixHint:
            "Expose only the specific mutations you intend (typed accessors), not the raw `&mut UID`.",
        })
      );
    }
    return diagnostics;
  },
});
