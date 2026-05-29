import { defineManifestRule, makeDiagnostic } from "../../utils/define-rule.js";
import { lineNumberAtOffset } from "../../utils/manifest-scan.js";

const VALID_EDITIONS = new Set(["2024.beta", "2024", "2024.alpha"]);

export const missingEdition2024 = defineManifestRule({
  id: "conventions/missing-edition-2024",
  bucket: "conventions",
  severity: "warning",
  citation: "Move Book: Use Right Edition",
  citationUrl:
    "https://move-book.com/guides/code-quality-checklist#use-right-edition",
  scan: (project, manifestSource) => {
    if (project.edition && VALID_EDITIONS.has(project.edition)) {
      return [];
    }
    const packageHeader = manifestSource.match(/^\s*\[package\]/m);
    const line = packageHeader
      ? lineNumberAtOffset(manifestSource, packageHeader.index!)
      : 1;
    const currentEdition = project.edition ?? "unset";
    return [
      makeDiagnostic({
        rule: missingEdition2024,
        filePath: project.manifestPath,
        line,
        message: `Package edition is "${currentEdition}". Set edition to "2024.beta" or "2024" to enable Move 2024 features.`,
        fixHint:
          'Add `edition = "2024.beta"` to the [package] section of Move.toml.',
      }),
    ];
  },
});
