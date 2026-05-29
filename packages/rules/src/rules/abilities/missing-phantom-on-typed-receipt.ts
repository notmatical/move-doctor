import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

interface TypeParams {
  hasPhantom: boolean;
  names: string[];
}

const typeParameters = (structNode: Node): TypeParams => {
  const params = structNode.childForFieldName("type_parameters");
  if (!params) {
    return { names: [], hasPhantom: false };
  }
  const paramNodes = params.namedChildren.filter(
    (child): child is Node => child?.type === "type_parameter"
  );
  const names = paramNodes
    .map(
      (param) =>
        param.namedChildren.find(
          (child) => child?.type === "type_parameter_identifier"
        )?.text ?? null
    )
    .filter((name): name is string => name !== null);
  const hasPhantom = paramNodes.some((param) => /\bphantom\b/.test(param.text));
  return { names, hasPhantom };
};

const fieldTypeNodes = (structNode: Node): Node[] => {
  const fields = structNode.childForFieldName("struct_fields");
  if (!fields) {
    return [];
  }
  const types: Node[] = [];
  for (const group of fields.namedChildren) {
    if (group?.type === "named_fields") {
      for (const annotation of group.namedChildren) {
        const type = annotation?.childForFieldName("type");
        if (type) {
          types.push(type);
        }
      }
    } else if (group?.type === "positional_fields") {
      for (const type of group.namedChildren) {
        if (type) {
          types.push(type);
        }
      }
    }
  }
  return types;
};

export const missingPhantomOnTypedReceipt = defineAstRule({
  id: "abilities/missing-phantom-on-typed-receipt",
  bucket: "abilities",
  severity: "warning",
  citation: "Move Book: Generics (phantom type parameters)",
  citationUrl: "https://move-book.com/move-basics/generics",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const structNode of collectNodesOfType(
      tree.rootNode,
      "struct_definition"
    )) {
      const { names, hasPhantom } = typeParameters(structNode);
      if (names.length === 0 || hasPhantom) {
        continue;
      }
      const typeNodes = fieldTypeNodes(structNode);
      if (typeNodes.length === 0) {
        continue;
      }
      const fieldTypeBlob = typeNodes.map((node) => node.text).join(" ");
      const unusedGenerics = names.filter(
        (generic) => !new RegExp(`\\b${generic}\\b`).test(fieldTypeBlob)
      );
      if (unusedGenerics.length === 0) {
        continue;
      }
      const nameNode = structNode.childForFieldName("name");
      const structName = nameNode?.text ?? "<anonymous>";
      for (const unused of unusedGenerics) {
        diagnostics.push(
          makeDiagnostic({
            rule: missingPhantomOnTypedReceipt,
            filePath: file.filePath,
            ...nodePosition(nameNode ?? structNode),
            message: `Struct "${structName}" declares type parameter \`${unused}\` but never uses it in a field. It should be \`phantom ${unused}\` so it binds type-dependent logic without affecting the layout.`,
            fixHint: `Change the declaration to use \`phantom ${unused}\`.`,
          })
        );
      }
    }
    return diagnostics;
  },
});
