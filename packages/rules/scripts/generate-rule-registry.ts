#!/usr/bin/env bun
// Scans src/rules/<bucket>/*.ts, finds every `export const <name> = defineRule(`
// / `defineManifestRule(` / `defineAstRule(`, and codegens rule-registry.ts.

import { readdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

interface RuleImport {
  exportName: string;
  importPath: string;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rulesRoot = path.resolve(currentDir, "..", "src", "rules");
const registryPath = path.resolve(currentDir, "..", "src", "rule-registry.ts");

const camelCase = (input) =>
  input.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase());

const collectRuleFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const collected: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectRuleFiles(fullPath);
      collected.push(...nested);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".ts")) {
      continue;
    }
    if (entry.name.endsWith(".test.ts")) {
      continue;
    }
    collected.push(fullPath);
  }
  return collected;
};

const classifyRule = (source) => {
  if (/defineManifestRule\s*\(/.test(source)) {
    return "manifest";
  }
  if (/defineAstRule\s*\(/.test(source)) {
    return "ast";
  }
  if (/defineRule\s*\(/.test(source)) {
    return "file";
  }
  return null;
};

const extractExportName = (source, fileName) => {
  const exportMatch = source.match(
    /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*define(?:Manifest|Ast)?Rule\s*\(/
  );
  if (exportMatch) {
    return exportMatch[1];
  }
  return camelCase(path.basename(fileName, ".ts"));
};

const main = async () => {
  const ruleFiles = (await collectRuleFiles(rulesRoot)).sort();

  const fileRuleImports: RuleImport[] = [];
  const manifestRuleImports: RuleImport[] = [];
  const astRuleImports: RuleImport[] = [];

  for (const ruleFile of ruleFiles) {
    const source = await readFile(ruleFile, "utf8");
    const kind = classifyRule(source);
    if (!kind) {
      continue;
    }
    const exportName = extractExportName(source, ruleFile);
    const importPath = `./rules/${path
      .relative(rulesRoot, ruleFile)
      .replace(/\\/g, "/")
      .replace(/\.ts$/, ".js")}`;
    const entry = { exportName, importPath };
    if (kind === "manifest") {
      manifestRuleImports.push(entry);
    } else if (kind === "ast") {
      astRuleImports.push(entry);
    } else {
      fileRuleImports.push(entry);
    }
  }

  const importLines = [
    ...fileRuleImports,
    ...manifestRuleImports,
    ...astRuleImports,
  ]
    .map(
      ({ exportName, importPath }) =>
        `import { ${exportName} } from "${importPath}";`
    )
    .join("\n");

  const toArray = (imports) =>
    imports.map(({ exportName }) => `  ${exportName},`).join("\n");

  const output = `// GENERATED FILE — do not edit by hand. Run \`bun run gen\` to regenerate.
// Source of truth: every \`defineRule\` / \`defineManifestRule\` / \`defineAstRule\`
// under \`src/rules/<bucket>/<rule>.ts\`. Classification is by which \`define*\`
// the rule uses, so AST rules land in \`astRules\` automatically.

import type { AstRule, ManifestRule, Rule } from "core";
${importLines ? `\n${importLines}\n` : ""}
// Regex/text rules — layout, comments, import lines, and \`Move.toml\` checks the
// parse tree can't express.
export const fileRules: readonly Rule[] = [
${toArray(fileRuleImports)}
];

export const manifestRules: readonly ManifestRule[] = [
${toArray(manifestRuleImports)}
];

// AST rules — parsed once per file via the tree-sitter Move grammar.
export const astRules: readonly AstRule[] = [
${toArray(astRuleImports)}
];
`;

  await writeFile(registryPath, output, "utf8");
  console.log(
    `Wrote ${registryPath} (${fileRuleImports.length} file, ${manifestRuleImports.length} manifest, ${astRuleImports.length} ast rules)`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
