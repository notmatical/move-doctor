import type { Diagnostic } from "core";
import { defineManifestRule, makeDiagnostic } from "../../utils/define-rule.js";
import {
  extractSection,
  lineNumberAtOffset,
  scanManifest,
} from "../../utils/manifest-scan.js";

const GENERIC_ADDRESS_NAMES = new Set([
  "math",
  "utils",
  "lib",
  "core",
  "common",
  "main",
  "package",
  "addr",
  "address",
  "self",
]);

export const unprefixedNamedAddress = defineManifestRule({
  id: "conventions/unprefixed-named-address",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book: Prefix Named Addresses",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#prefix-named-addresses",
  scan: (project, manifestSource) => {
    const section = extractSection(manifestSource, "addresses");
    if (!section) {
      return [];
    }
    const sectionSource = manifestSource.slice(section.start, section.end);
    const diagnostics: Diagnostic[] = [];
    scanManifest(sectionSource, /^\s*([A-Za-z_][\w]*)\s*=/gm, (match) => {
      const addressName = match.groups[1] ?? "";
      if (!GENERIC_ADDRESS_NAMES.has(addressName.toLowerCase())) {
        return;
      }
      const absoluteOffset = section.start + (match.groups.index ?? 0);
      diagnostics.push(
        makeDiagnostic({
          rule: unprefixedNamedAddress,
          filePath: project.manifestPath,
          line: lineNumberAtOffset(manifestSource, absoluteOffset),
          message: `Named address "${addressName}" is generic and risks namespace collisions. Prefix it with your project name.`,
          fixHint: `Rename to e.g. \`${project.packageName}_${addressName}\`.`,
        })
      );
    });
    return diagnostics;
  },
});
