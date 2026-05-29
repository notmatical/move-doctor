import type { Node } from "web-tree-sitter";

// Depth-first collection of every named node of `type`. tree-sitter exposes
// `descendantsOfType`, but a plain walk over `namedChildren` is API-stable
// across web-tree-sitter versions and plenty fast for a single file.
export const collectNodesOfType = (root: Node, type: string): Node[] => {
  const found: Node[] = [];
  const visit = (node: Node): void => {
    if (node.type === type) {
      found.push(node);
    }
    for (const child of node.namedChildren) {
      if (child) {
        visit(child);
      }
    }
  };
  visit(root);
  return found;
};

// tree-sitter positions are 0-based (row/column); move-doctor diagnostics are
// 1-based line/column.
export const nodePosition = (node: Node): { column: number; line: number } => ({
  line: node.startPosition.row + 1,
  column: node.startPosition.column + 1,
});

export const fieldText = (node: Node, fieldName: string): string | null =>
  node.childForFieldName(fieldName)?.text ?? null;
