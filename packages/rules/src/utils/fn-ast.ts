import type { Node } from "web-tree-sitter";
import { collectNodesOfType, fieldText } from "./ast.js";

export interface FnParam {
  name: string;
  node: Node;
  type: string;
}

// `function_definition` and `macro_function_definition` share the same shape:
// `(modifier)` children, a `name` field, a `parameters` field, an optional
// `return_type` field, and a `body` field. The regex finder treated both, so we
// collect both here.
export const collectFunctions = (root: Node): Node[] => [
  ...collectNodesOfType(root, "function_definition"),
  ...collectNodesOfType(root, "macro_function_definition"),
];

export const modifierTexts = (fnNode: Node): string[] =>
  fnNode.namedChildren
    .filter((child): child is Node => child?.type === "modifier")
    .map((child) => child.text);

// The regex rules all gate on `visibility === "public"` — exactly `public`, not
// `public(package)` or `public(friend)`. Mirror that precisely.
export const isPublic = (fnNode: Node): boolean =>
  modifierTexts(fnNode).includes("public");

export const isEntry = (fnNode: Node): boolean =>
  modifierTexts(fnNode).includes("entry");

export const functionName = (fnNode: Node): string | null =>
  fieldText(fnNode, "name");

export const hasReturnType = (fnNode: Node): boolean =>
  fnNode.childForFieldName("return_type") !== null;

export const functionParams = (fnNode: Node): FnParam[] => {
  const params = fnNode.childForFieldName("parameters");
  if (!params) {
    return [];
  }
  return params.namedChildren
    .filter((child): child is Node => child?.type === "function_parameter")
    .map((child) => {
      const typeNode = child.childForFieldName("type");
      return {
        name: child.childForFieldName("name")?.text ?? "",
        type: typeNode?.text ?? "",
        node: child,
      };
    });
};
