#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");
const docsRoot = path.join(repoRoot, "docs", "rules");

const { fileRules, manifestRules, astRules } = await import(
  path.join(repoRoot, "packages/rules/dist/index.js")
);

const _sampleDiagnostic = (rule) => {
  if (rule.scan.length === 1) {
    // file rule: pass a dummy MoveFile with empty source and call scan to capture defaults
    try {
      const diagnostics = rule.scan({
        filePath: "/example.move",
        source: "",
        lines: [""],
      });
      return diagnostics[0] ?? null;
    } catch {
      return null;
    }
  }
  return null;
};

const renderPlaybook = (rule) => {
  const sourceUrl = `https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/${rule.bucket}/${rule.id.split("/").slice(1).join("/")}.ts`;
  const citationLine = rule.citationUrl
    ? `[${rule.citation}](${rule.citationUrl})`
    : (rule.citation ?? "no citation");

  return `# ${rule.id}

**Severity:** \`${rule.severity}\` &nbsp; **Bucket:** \`${rule.bucket}\` &nbsp; **Source:** ${citationLine}

## What this catches

> This page is a v0.1 generated stub. The runtime detector ships the message and fix hint below — see the [source file](${sourceUrl}) for the exact pattern and edge cases the rule covers.

## How an agent should fix it

When move-doctor reports \`${rule.id}\`:

1. Open the reported file at the diagnostic's \`line:column\`.
2. Apply the fix described in the diagnostic's \`fixHint\`.
3. Re-run \`npx move-doctor@latest --score\` and confirm the score did not regress.
4. Do **not** suppress this rule unless the surrounding code is a documented exception.

## Source

- Rule definition: [\`packages/rules/src/rules/${rule.bucket}/${rule.id.split("/").slice(1).join("/")}.ts\`](${sourceUrl})
- Canonical reference: ${citationLine}
`;
};

const writeStub = async (rule) => {
  const slug = rule.id.split("/").slice(1).join("/");
  const bucketDir = path.join(docsRoot, rule.bucket);
  await mkdir(bucketDir, { recursive: true });
  const filePath = path.join(bucketDir, `${slug}.md`);
  if (existsSync(filePath)) {
    return { filePath, wrote: false };
  }
  await writeFile(filePath, renderPlaybook(rule), "utf8");
  return { filePath, wrote: true };
};

const allRules = [...fileRules, ...manifestRules, ...astRules];
let written = 0;
let skipped = 0;
for (const rule of allRules) {
  const { wrote } = await writeStub(rule);
  if (wrote) {
    written += 1;
  } else {
    skipped += 1;
  }
}
console.log(
  `Generated ${written} playbook stubs (${skipped} skipped — already authored).`
);
