import type { Diagnostic } from "core";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  functionParams,
  isPublic,
} from "../../utils/fn-ast.js";

const isCapType = (type: string): boolean => {
  const stripped = type
    .replace(/^&\s*mut\s+/, "")
    .replace(/^&\s*/, "")
    .trim();
  const head = stripped.split("<")[0]?.split("::").pop() ?? stripped;
  return /Cap$/.test(head);
};

const isMutObjectRef = (type: string): boolean => {
  if (!type.trimStart().startsWith("&mut")) {
    return false;
  }
  const inner = type.replace(/^&\s*mut\s+/, "").trim();
  const head = inner.split("<")[0]?.split("::").pop() ?? inner;
  return /^[A-Z]/.test(head) && head !== "TxContext" && head !== "Clock";
};

export const paramOrderCapSecond = defineAstRule({
  id: "functions/param-order-cap-second",
  bucket: "functions",
  severity: "info",
  citation: "Move Book: Capabilities Go Second",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#capabilities-go-second",
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
      for (let index = 0; index < params.length; index += 1) {
        const param = params[index]!;
        if (!isCapType(param.type)) {
          continue;
        }
        const objectIndex = params.findIndex(
          (later, laterIndex) =>
            laterIndex > index && isMutObjectRef(later.type)
        );
        if (objectIndex === -1) {
          continue;
        }
        const objectParam = params[objectIndex]!;
        diagnostics.push(
          makeDiagnostic({
            rule: paramOrderCapSecond,
            filePath: file.filePath,
            ...nodePosition(fnNode),
            message: `Function "${name}" puts capability "${param.name}: ${param.type}" before its target object "${objectParam.name}: ${objectParam.type}". Move convention: object first, then cap.`,
            fixHint: `Swap so the signature reads \`fun ${name}(${objectParam.name}: ${objectParam.type}, ${param.name}: ${param.type}, ...)\`.`,
          })
        );
        break;
      }
    }
    return diagnostics;
  },
});
