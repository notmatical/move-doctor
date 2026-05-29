import type { Diagnostic } from "core";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import { collectFunctions, functionName } from "../../utils/fn-ast.js";

// Move convention is snake_case for functions; any uppercase letter means it's
// camelCase / PascalCase.
const isSnakeCase = (name: string): boolean => !/[A-Z]/.test(name);

const toSnakeCase = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[A-Z]+/g, (run) => `_${run}`)
    .replace(/^_+/, "")
    .toLowerCase();

export const nonSnakeCaseFunction = defineAstRule({
  id: "conventions/non-snake-case-function",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Coding Conventions",
  citationUrl: "https://move-book.com/reference/coding-conventions",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      const name = functionName(fnNode);
      if (!name || isSnakeCase(name)) {
        continue;
      }
      diagnostics.push(
        makeDiagnostic({
          rule: nonSnakeCaseFunction,
          filePath: file.filePath,
          ...nodePosition(fnNode.childForFieldName("name") ?? fnNode),
          message: `Function "${name}" is not snake_case. Move names functions in snake_case.`,
          fixHint: `Rename to "${toSnakeCase(name)}".`,
        })
      );
    }
    return diagnostics;
  },
});
