import type { Diagnostic, MoveFile } from "core";
import type { Node } from "web-tree-sitter";
import { collectNodesOfType, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

const CAP_TYPE = /^[A-Z][A-Za-z0-9_]*Cap$/;
const SHARE_MEMBERS = new Set(["share_object", "public_share_object"]);

// The single named-child `name_expression` of a `call_expression` is its callee.
const calleeAccess = (call: Node): Node | null => {
  const nameExpr = call.namedChildren.find(
    (child): child is Node => child?.type === "name_expression"
  );
  return nameExpr?.childForFieldName("access") ?? null;
};

// True for `transfer::share_object` / `transfer::public_share_object` callees,
// returning the member name (the share function) when so.
const shareTransferMember = (call: Node): string | null => {
  const access = calleeAccess(call);
  if (!access || access.type !== "module_access") {
    return null;
  }
  if (access.childForFieldName("module")?.text !== "transfer") {
    return null;
  }
  const member = access.childForFieldName("member")?.text;
  return member && SHARE_MEMBERS.has(member) ? member : null;
};

// The bare struct-type name of a `XxxCap { ... }` pack literal, or null.
const packCapType = (node: Node): string | null => {
  if (node.type !== "pack_expression") {
    return null;
  }
  const nameExpr = node.namedChildren.find(
    (child): child is Node => child?.type === "name_expression"
  );
  const typeName = nameExpr
    ?.childForFieldName("access")
    ?.childForFieldName("member")?.text;
  return typeName && CAP_TYPE.test(typeName) ? typeName : null;
};

const firstArg = (call: Node): Node | null => {
  const args = call.childForFieldName("args");
  return args?.namedChildren.find((child): child is Node => !!child) ?? null;
};

const scanShares = (file: MoveFile, root: Node): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  // Direct: transfer::(public_)share_object(XxxCap { ... }).
  for (const call of collectNodesOfType(root, "call_expression")) {
    const member = shareTransferMember(call);
    if (!member) {
      continue;
    }
    const arg = firstArg(call);
    if (!arg) {
      continue;
    }
    const capType = packCapType(arg);
    if (!capType) {
      continue;
    }
    const prefix = `transfer::${member}(${capType} {`;
    diagnostics.push(
      makeDiagnostic({
        rule: publicShareOfCap,
        filePath: file.filePath,
        ...nodePosition(call),
        message: `\`${prefix})\` shares capability "${capType}" publicly. Anyone can now call admin functions guarded by it.`,
        fixHint:
          "Use `transfer::transfer(cap, tx_context::sender(ctx))` to give the cap to the deployer instead.",
      })
    );
  }

  // Bound variable, scoped per function: `let cap = XxxCap { .. }` then
  // `transfer::(public_)share_object(cap)`.
  for (const fn of collectNodesOfType(root, "function_definition")) {
    const capBindings = new Map<string, string>();
    for (const letStmt of collectNodesOfType(fn, "let_statement")) {
      const capType = packCapType(letStmt.childForFieldName("expr") ?? letStmt);
      if (!capType) {
        continue;
      }
      const binds = letStmt.childForFieldName("binds");
      const bindVar = binds
        ? collectNodesOfType(binds, "variable_identifier")[0]
        : null;
      if (bindVar) {
        capBindings.set(bindVar.text, capType);
      }
    }
    if (capBindings.size === 0) {
      continue;
    }
    for (const call of collectNodesOfType(fn, "call_expression")) {
      if (!shareTransferMember(call)) {
        continue;
      }
      const arg = firstArg(call);
      if (!arg || arg.type !== "name_expression") {
        continue;
      }
      const sharedName = arg.text;
      const capType = capBindings.get(sharedName);
      if (!capType) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: publicShareOfCap,
          filePath: file.filePath,
          ...nodePosition(call),
          message: `Variable "${sharedName}" of type "${capType}" is publicly shared. Anyone can now call admin functions guarded by "${capType}".`,
          fixHint: `Use \`transfer::transfer(${sharedName}, tx_context::sender(ctx))\` to give the cap to the deployer instead.`,
        })
      );
    }
  }

  return diagnostics;
};

export const publicShareOfCap = defineAstRule({
  id: "security/public-share-of-cap",
  bucket: "security",
  severity: "error",
  citation: "Move Book: Capability Pattern",
  citationUrl: "https://move-book.com/programmability/capability",
  scanAst: ({ file, tree }) => scanShares(file, tree.rootNode),
});
