import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const isPublicStruct = (structNode: Node): boolean =>
  structNode.children.some((child) => child?.type === "public");

const isPositionalStruct = (structNode: Node): boolean => {
  const fields = structNode.childForFieldName("struct_fields");
  return (
    fields?.namedChildren.some(
      (child) => child?.type === "positional_fields"
    ) ?? false
  );
};

export const dynamicFieldKeyMissingSuffix = defineAstRule({
  id: "conventions/dynamic-field-key-missing-suffix",
  bucket: "conventions",
  severity: "info",
  citation:
    "Move Book: Use Positional Structs for Dynamic Field Keys + Key Suffix",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#use-positional-structs-for-dynamic-field-keys--key-suffix",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const structNode of collectNodesOfType(
      tree.rootNode,
      "struct_definition"
    )) {
      // The original regex only matched `public struct` declarations whose
      // name began with an uppercase letter.
      if (!isPublicStruct(structNode)) {
        continue;
      }
      const nameNode = structNode.childForFieldName("name");
      const name = nameNode?.text;
      if (!(name && /^[A-Z]/.test(name))) {
        continue;
      }
      if (!isPositionalStruct(structNode)) {
        continue;
      }
      if (name.endsWith("Key")) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: dynamicFieldKeyMissingSuffix,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? structNode),
          message: `Positional struct "${name}" looks like a dynamic-field key but lacks a Key suffix.`,
          fixHint: `Rename to "${name}Key" to signal dynamic-field-key semantics.`,
        })
      );
    }
    return diagnostics;
  },
});
