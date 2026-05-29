import type { Diagnostic } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

interface MethodReplacement {
  // When set, only matches a call with exactly this argument count.
  arity?: number;
  citation: string;
  citationUrl: string;
  member: string;
  // Builds the suggestion. `firstArg` is the text of the first call argument
  // (used to mirror the regex rule's receiver-aware suggestions).
  methodForm: (firstArg: string) => string;
  module: string;
  // The `module::member` label shown in the message. For the no-arg
  // `vector::empty()` case this differs from `${module}::${member}`.
  modulePath: string;
}

const REPLACEMENTS: MethodReplacement[] = [
  {
    module: "tx_context",
    member: "sender",
    modulePath: "tx_context::sender",
    methodForm: (arg) => `${arg}.sender()`,
    citation: "Move Book: ctx has sender()",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#ctx-has-sender",
  },
  {
    module: "object",
    member: "delete",
    modulePath: "object::delete",
    methodForm: (arg) => `${arg}.delete()`,
    citation: "Move Book: UID has delete",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#uid-has-delete",
  },
  {
    module: "vector",
    member: "push_back",
    modulePath: "vector::push_back",
    methodForm: () => "vec.push_back(x)",
    citation: "Move Book: Vector Has a Literal. And Associated Functions",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#vector-has-a-literal-and-associated-functions",
  },
  {
    module: "vector",
    member: "length",
    modulePath: "vector::length",
    methodForm: () => "vec.length()",
    citation: "Move Book: Vector Has a Literal. And Associated Functions",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#vector-has-a-literal-and-associated-functions",
  },
  {
    module: "vector",
    member: "empty",
    modulePath: "vector::empty()",
    methodForm: () => "vector[]",
    citation: "Move Book: Vector Has a Literal. And Associated Functions",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#vector-has-a-literal-and-associated-functions",
    arity: 0,
  },
  {
    module: "vector",
    member: "pop_back",
    modulePath: "vector::pop_back",
    methodForm: () => "vec.pop_back()",
    citation: "Move Book: Vector Has a Literal. And Associated Functions",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#vector-has-a-literal-and-associated-functions",
  },
  {
    module: "vector",
    member: "is_empty",
    modulePath: "vector::is_empty",
    methodForm: () => "vec.is_empty()",
    citation: "Move Book: Vector Has a Literal. And Associated Functions",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#vector-has-a-literal-and-associated-functions",
  },
  {
    module: "coin",
    member: "split",
    modulePath: "coin::split",
    methodForm: () => "coin.split(amount, ctx)",
    citation: "Move Book: Common Coin Operations",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#common-coin-operations",
  },
  {
    module: "coin",
    member: "value",
    modulePath: "coin::value",
    methodForm: () => "coin.value()",
    citation: "Move Book: Common Coin Operations",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#common-coin-operations",
  },
  {
    module: "coin",
    member: "into_balance",
    modulePath: "coin::into_balance",
    methodForm: () => "coin.into_balance()",
    citation: "Move Book: Common Coin Operations",
    citationUrl:
      "https://move-book.com/guides/code-quality-checklist#common-coin-operations",
  },
];

const replacementByKey = new Map<string, MethodReplacement>(
  REPLACEMENTS.map((r) => [`${r.module}::${r.member}`, r])
);

export const moduleFnInsteadOfMethod = defineAstRule({
  id: "idioms/module-fn-instead-of-method",
  bucket: "idioms",
  severity: "info",
  citation: "Move Book: Function Body: Struct Methods",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#function-body-struct-methods",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const call of collectNodesOfType(tree.rootNode, "call_expression")) {
      const nameExpr = call.namedChildren[0];
      const access = nameExpr?.childForFieldName("access");
      if (access?.type !== "module_access") {
        continue;
      }
      const moduleName = access.childForFieldName("module")?.text;
      const member = access.childForFieldName("member")?.text;
      if (!(moduleName && member)) {
        continue;
      }
      const replacement = replacementByKey.get(`${moduleName}::${member}`);
      if (!replacement) {
        continue;
      }
      const args = call.childForFieldName("args");
      const argNodes = args?.namedChildren.filter((child): child is Node =>
        Boolean(child)
      );
      if (
        replacement.arity !== undefined &&
        (argNodes?.length ?? 0) !== replacement.arity
      ) {
        continue;
      }
      const firstArg = argNodes?.[0]?.text ?? "";
      const suggestion = replacement.methodForm(firstArg);
      diagnostics.push(
        makeDiagnostic({
          rule: {
            ...moduleFnInsteadOfMethod,
            citation: replacement.citation,
            citationUrl: replacement.citationUrl,
          },
          filePath: file.filePath,
          ...nodePosition(call),
          message: `\`${replacement.modulePath}\` has a method form in Move 2024. Prefer the method-syntax call.`,
          fixHint: `Use \`${suggestion}\`.`,
        })
      );
    }
    return diagnostics;
  },
});
