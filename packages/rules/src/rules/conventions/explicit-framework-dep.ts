import type { Diagnostic } from "core";
import { defineManifestRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  extractSection,
  lineNumberAtOffset,
  scanManifest,
} from "../../utils/manifest-scan.js";

const IMPLICIT_PACKAGES = new Set(["Sui", "MoveStdlib", "Bridge", "SuiSystem"]);

export const explicitFrameworkDep = defineManifestRule({
  id: "conventions/explicit-framework-dep",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Implicit Framework Dependency",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#implicit-framework-dependency",
  scan: (project, manifestSource) => {
    const section = extractSection(manifestSource, "dependencies");
    if (!section) {
      return [];
    }
    const sectionSource = manifestSource.slice(section.start, section.end);
    const diagnostics: Diagnostic[] = [];
    scanManifest(sectionSource, /^\s*([A-Za-z_][\w]*)\s*=/gm, (match) => {
      const depName = match.groups[1] ?? "";
      if (!IMPLICIT_PACKAGES.has(depName)) {
        return;
      }
      const absoluteOffset = section.start + (match.groups.index ?? 0);
      diagnostics.push(
        makeDiagnostic({
          rule: explicitFrameworkDep,
          filePath: project.manifestPath,
          line: lineNumberAtOffset(manifestSource, absoluteOffset),
          message: `"${depName}" is implicit from Sui 1.45+; remove it from [dependencies].`,
          fixHint: `Delete the \`${depName} = { ... }\` line from [dependencies].`,
        })
      );
    });
    return diagnostics;
  },
});
