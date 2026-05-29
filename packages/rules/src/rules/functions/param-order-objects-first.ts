import type { Diagnostic } from "core";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  functionParams,
  isPublic,
} from "../../utils/fn-ast.js";

const PRIMITIVE_TYPES = new Set([
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "u256",
  "bool",
  "address",
  "vector",
]);

const isObjectRefType = (type: string): boolean => {
  const stripped = type
    .replace(/^&\s*mut\s+/, "")
    .replace(/^&\s*/, "")
    .replace(/<.*>$/, "")
    .trim();
  if (stripped.length === 0) {
    return false;
  }
  if (stripped === "TxContext") {
    return false;
  }
  if (stripped === "Clock") {
    return false;
  }
  const head = stripped.split("::").pop() ?? stripped;
  if (PRIMITIVE_TYPES.has(head)) {
    return false;
  }
  return /^[A-Z]/.test(head);
};

const isPrimitiveType = (type: string): boolean => {
  const stripped = type
    .replace(/^&\s*mut\s+/, "")
    .replace(/^&\s*/, "")
    .trim();
  const head = stripped.split("<")[0]?.trim() ?? stripped;
  return PRIMITIVE_TYPES.has(head);
};

export const paramOrderObjectsFirst = defineAstRule({
  id: "functions/param-order-objects-first",
  bucket: "functions",
  severity: "info",
  citation: "Move Book: Objects Go First (Except for Clock)",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#objects-go-first-except-for-clock",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      if (!isPublic(fnNode)) {
        continue;
      }
      const name = functionName(fnNode);
      if (!name) {
        continue;
      }
      const params = functionParams(fnNode);
      if (params.length < 2) {
        continue;
      }
      let firstPrimitiveIndex = -1;
      for (let index = 0; index < params.length; index += 1) {
        if (isPrimitiveType(params[index]!.type)) {
          firstPrimitiveIndex = index;
          break;
        }
      }
      if (firstPrimitiveIndex === -1) {
        continue;
      }
      let laterObjectIndex = -1;
      for (
        let index = firstPrimitiveIndex + 1;
        index < params.length;
        index += 1
      ) {
        if (isObjectRefType(params[index]!.type)) {
          laterObjectIndex = index;
          break;
        }
      }
      if (laterObjectIndex === -1) {
        continue;
      }
      const lateObject = params[laterObjectIndex]!;
      diagnostics.push(
        makeDiagnostic({
          rule: paramOrderObjectsFirst,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Function "${name}" puts primitive "${params[firstPrimitiveIndex]!.name}" before object "${lateObject.name}". Move convention: objects before primitives (Clock and TxContext stay at the end).`,
          fixHint: `Move "${lateObject.name}: ${lateObject.type}" before "${params[firstPrimitiveIndex]!.name}".`,
        })
      );
    }
    return diagnostics;
  },
});
