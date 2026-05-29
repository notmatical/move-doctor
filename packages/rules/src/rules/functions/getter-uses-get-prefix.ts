import type { Diagnostic } from "core";
import { nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  collectFunctions,
  functionName,
  functionParams,
  hasReturnType,
  isPublic,
} from "../../utils/fn-ast.js";

// A single `&Self` / `&mut Self` parameter where the referenced type starts
// with an uppercase letter — the shape of an accessor over a struct. Mirrors
// the type half of the original SINGLE_SELF_REF_PARAM regex.
const SELF_REF_TYPE = /^&(?:mut\s+)?[A-Z][A-Za-z0-9_<>:]*$/;

export const getterUsesGetPrefix = defineAstRule({
  id: "functions/getter-uses-get-prefix",
  bucket: "functions",
  severity: "info",
  citation: "Move Book: Getters Named After Field + _mut",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#getters-named-after-field--_mut",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const fnNode of collectFunctions(tree.rootNode)) {
      if (!isPublic(fnNode)) {
        continue;
      }
      const name = functionName(fnNode);
      if (!name?.startsWith("get_")) {
        continue;
      }
      if (!hasReturnType(fnNode)) {
        continue;
      }
      const params = functionParams(fnNode);
      if (params.length !== 1) {
        continue;
      }
      const onlyType = params[0]!.type.trim();
      if (!SELF_REF_TYPE.test(onlyType)) {
        continue;
      }
      const suggested = name.replace(/^get_/, "");
      diagnostics.push(
        makeDiagnostic({
          rule: getterUsesGetPrefix,
          filePath: file.filePath,
          ...nodePosition(fnNode),
          message: `Getter "${name}" uses a \`get_\` prefix. Move idiom is to name accessors after the field (or with a \`_mut\` suffix for mutable getters).`,
          fixHint: `Rename to "${suggested}"${onlyType.includes("&mut") ? ` or "${suggested}_mut"` : ""}.`,
        })
      );
    }
    return diagnostics;
  },
});
