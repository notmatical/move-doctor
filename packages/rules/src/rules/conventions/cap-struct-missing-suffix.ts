import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import {
  collectNodesOfType,
  fieldText,
  nodePosition,
} from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const isUidType = (type: string | null): boolean =>
  type === "UID" || (type?.endsWith("::UID") ?? false);

const abilityNames = (structNode: Node): string[] => {
  const decls =
    structNode.childForFieldName("ability_declarations") ??
    structNode.childForFieldName("postfix_ability_declarations");
  if (!decls) {
    return [];
  }
  return decls.namedChildren
    .filter((child): child is Node => child?.type === "ability")
    .map((child) => child.text);
};

// The single `id: UID` named field is what makes a struct look like a bare
// capability marker. Returns true only for a `{ id: UID }` body — positional
// structs and any extra field disqualify it.
const isKeyOnlyUidStruct = (structNode: Node): boolean => {
  const fields = structNode.childForFieldName("struct_fields");
  const namedFields = fields?.namedChildren.find(
    (child) => child?.type === "named_fields"
  );
  if (!namedFields) {
    return false;
  }
  const annotations = namedFields.namedChildren.filter(
    (child): child is Node => child?.type === "field_annotation"
  );
  if (annotations.length !== 1) {
    return false;
  }
  const only = annotations[0]!;
  return (
    fieldText(only, "field") === "id" && isUidType(fieldText(only, "type"))
  );
};

export const capStructMissingSuffix = defineAstRule({
  id: "conventions/cap-struct-missing-suffix",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Capabilities are Suffixed with Cap",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#capabilities-are-suffixed-with-cap",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const structNode of collectNodesOfType(
      tree.rootNode,
      "struct_definition"
    )) {
      const nameNode = structNode.childForFieldName("name");
      const name = nameNode?.text;
      if (!name || name.endsWith("Cap")) {
        continue;
      }
      if (!abilityNames(structNode).includes("key")) {
        continue;
      }
      if (!isKeyOnlyUidStruct(structNode)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: capStructMissingSuffix,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? structNode),
          message: `Struct "${name}" looks like a capability (\`key\` ability, single \`id: UID\` field) but lacks a Cap suffix.`,
          fixHint: `Rename to "${name}Cap" to signal capability semantics.`,
        })
      );
    }
    return diagnostics;
  },
});
