import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const isPublicStruct = (structNode: Node): boolean =>
  structNode.children.some((child) => child?.type === "public");

export const potatoInTypeName = defineAstRule({
  id: "conventions/potato-in-type-name",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: No Potato in Names",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#no-potato-in-names",
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
      if (!/Potato/.test(name)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: potatoInTypeName,
          filePath: file.filePath,
          ...nodePosition(nameNode ?? structNode),
          message: `Struct "${name}" contains "Potato" in its name. The hot-potato pattern is evident from the absence of abilities — the suffix is redundant.`,
          fixHint: `Rename to drop "Potato" (e.g. "${name.replace(/Potato/g, "")}").`,
        })
      );
    }
    return diagnostics;
  },
});
