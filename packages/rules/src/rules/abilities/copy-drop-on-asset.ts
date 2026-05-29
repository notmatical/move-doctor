import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import {
  collectNodesOfType,
  fieldText,
  nodePosition,
} from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const ASSET_FIELD_TYPE = /^(UID|Balance<[^>]+>|Coin<[^>]+>)$/;

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

const hasAssetField = (structNode: Node): boolean => {
  const fields = structNode.childForFieldName("struct_fields");
  const namedFields = fields?.namedChildren.find(
    (child) => child?.type === "named_fields"
  );
  if (!namedFields) {
    return false;
  }
  return namedFields.namedChildren
    .filter((child): child is Node => child?.type === "field_annotation")
    .some((annotation) => {
      const type = fieldText(annotation, "type");
      return type !== null && ASSET_FIELD_TYPE.test(type.trim());
    });
};

export const copyDropOnAsset = defineAstRule({
  id: "abilities/copy-drop-on-asset",
  bucket: "abilities",
  severity: "error",
  citation: "Move Book: Key Ability",
  citationUrl: "https://move-book.com/storage/key-ability",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const structNode of collectNodesOfType(
      tree.rootNode,
      "struct_definition"
    )) {
      const abilities = abilityNames(structNode);
      if (!(abilities.includes("copy") && abilities.includes("drop"))) {
        continue;
      }
      if (!hasAssetField(structNode)) {
        continue;
      }
      const nameNode = structNode.childForFieldName("name");
      const name = nameNode?.text ?? "<anonymous>";
      diagnostics.push(
        makeDiagnostic({
          rule: copyDropOnAsset,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? structNode),
          message: `Asset struct "${name}" has \`copy, drop\` plus an asset-shaped field (UID / Balance / Coin). Assets should use \`key, store\` only — copy+drop on an asset is typically a critical security mistake.`,
          fixHint:
            "Remove `copy, drop` from the asset; use a separate `copy, drop` snapshot struct for math.",
        })
      );
    }
    return diagnostics;
  },
});
