import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const EVENT_EMIT_CALLEE = /\bevent::emit/;
const UPPER_CAMEL = /^[A-Z][A-Za-z0-9_]*$/;

const PAST_TENSE_SUFFIXES = ["ed", "Ed", "en", "ten", "Ten", "ne", "Ne"];

const looksPastTense = (name: string): boolean =>
  PAST_TENSE_SUFFIXES.some((suffix) => name.endsWith(suffix));

// First identifier-like token of a node (the leading name of a pack/name
// expression or type argument), mirroring the original regex's first capture.
const leadingName = (node: Node): string | null => {
  const access = node.type === "module_access" ? node : firstModuleAccess(node);
  if (!access) {
    return null;
  }
  return (
    access.childForFieldName("member")?.text ??
    access.namedChildren.find((child) => child?.type === "identifier")?.text ??
    null
  );
};

const firstModuleAccess = (node: Node): Node | null => {
  for (const child of node.namedChildren) {
    if (!child) {
      continue;
    }
    if (child.type === "module_access") {
      return child;
    }
    const nested = firstModuleAccess(child);
    if (nested) {
      return nested;
    }
  }
  return null;
};

const typeArgName = (callee: Node): string | null => {
  const access = collectNodesOfType(callee, "type_arguments")[0];
  if (!access) {
    return null;
  }
  const applyType = access.namedChildren.find(
    (child) => child?.type === "apply_type"
  );
  return applyType ? leadingName(applyType) : null;
};

const argName = (call: Node): string | null => {
  const args = call.childForFieldName("args");
  const first = args?.namedChild(0);
  return first ? leadingName(first) : null;
};

export const eventNotPastTense = defineAstRule({
  id: "conventions/event-not-past-tense",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Events Should Be Named in Past Tense",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#events-should-be-named-in-past-tense",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    const seen = new Set<string>();
    for (const call of collectNodesOfType(tree.rootNode, "call_expression")) {
      const callee = call.namedChild(0);
      if (!(callee && EVENT_EMIT_CALLEE.test(callee.text))) {
        continue;
      }
      // Original priority: explicit type argument, then the first
      // capitalized token in the argument list.
      const candidate = typeArgName(callee) ?? argName(call);
      if (!(candidate && UPPER_CAMEL.test(candidate))) {
        continue;
      }
      const { line, column } = nodePosition(call);
      if (seen.has(`${line}:${candidate}`)) {
        continue;
      }
      seen.add(`${line}:${candidate}`);
      if (looksPastTense(candidate)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: eventNotPastTense,
          filePath: file.filePath,
          line,
          column,
          message: `Event type "${candidate}" looks present-tense. Events represent things that already happened — prefer a past-tense name.`,
          fixHint: `Rename to a past-tense form (e.g. "${candidate}d" or "${candidate}ed").`,
        })
      );
    }
    return diagnostics;
  },
});
