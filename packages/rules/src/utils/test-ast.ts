import type { Node } from "web-tree-sitter";

/**
 * Annotations attached to a function appear as `annotation` siblings that
 * precede the `function_definition` in the `module_body`. Walking backwards
 * over preceding named siblings collects every attribute line, stopping at the
 * first non-`annotation` / non-`newline` node (i.e. another definition).
 */
export const precedingAnnotations = (fnNode: Node): Node[] => {
  const annotations: Node[] = [];
  let sibling = fnNode.previousNamedSibling;
  while (sibling) {
    if (sibling.type === "annotation") {
      annotations.push(sibling);
    } else if (sibling.type !== "newline") {
      break;
    }
    sibling = sibling.previousNamedSibling;
  }
  return annotations;
};

/** Every `annotation_item` directly under the given `annotation` nodes. */
const annotationItems = (annotations: Node[]): Node[] => {
  const items: Node[] = [];
  for (const annotation of annotations) {
    for (const child of annotation.namedChildren) {
      if (child?.type === "annotation_item") {
        items.push(child);
      }
    }
  }
  return items;
};

// The leading name of an annotation item, whether it's a bare `#[test]`
// (annotation_expr) or a call-shaped `#[expected_failure(...)]` (annotation_list).
const annotationItemName = (item: Node): string | null => {
  const expr = item.childForFieldName("annotation_expr");
  if (expr) {
    return expr.childForFieldName("name")?.text ?? null;
  }
  const list = item.childForFieldName("annotation_list");
  if (list) {
    return list.childForFieldName("name")?.text ?? null;
  }
  return null;
};

const annotationNames = (annotations: Node[]): string[] =>
  annotationItems(annotations)
    .map((item) => annotationItemName(item))
    .filter((name): name is string => name !== null);

/** True when the function carries a `#[test]` attribute. */
export const isTestAnnotated = (fnNode: Node): boolean =>
  annotationNames(precedingAnnotations(fnNode)).includes("test");

/** True when the function carries an `#[expected_failure(...)]` attribute. */
export const hasExpectedFailure = (fnNode: Node): boolean =>
  annotationNames(precedingAnnotations(fnNode)).includes("expected_failure");

export const functionName = (fnNode: Node): string | null =>
  fnNode.childForFieldName("name")?.text ?? null;

/**
 * For a `macro_call_expression`, the trailing member identifier of its access
 * path (e.g. `assert` for `assert!`, `assert_eq` for `assert_eq!`).
 */
export const macroCallName = (macroNode: Node): string | null => {
  const access = macroNode.childForFieldName("access");
  const moduleAccess = access?.childForFieldName("access");
  return moduleAccess?.childForFieldName("member")?.text ?? null;
};

/**
 * For a `call_expression`, the `module::member` parts when the callee is a
 * module-qualified path. Returns nulls for unqualified or non-path callees.
 */
export const callExpressionPath = (
  callNode: Node
): { member: string | null; module: string | null } => {
  const callee = callNode.namedChildren.find(
    (child) => child?.type === "name_expression"
  );
  const moduleAccess = callee?.childForFieldName("access");
  return {
    module: moduleAccess?.childForFieldName("module")?.text ?? null,
    member: moduleAccess?.childForFieldName("member")?.text ?? null,
  };
};

/**
 * For a `dot_expression` whose `access` is a call (method-call syntax like
 * `x.end()`), the called method name. Returns null otherwise.
 */
export const dotCallMethodName = (dotNode: Node): string | null => {
  const access = dotNode.childForFieldName("access");
  if (access?.type !== "call_expression") {
    return null;
  }
  const callee = access.namedChildren.find(
    (child) => child?.type === "name_expression"
  );
  return (
    callee?.childForFieldName("access")?.childForFieldName("member")?.text ??
    null
  );
};
