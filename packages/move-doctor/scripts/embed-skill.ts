#!/usr/bin/env bun
// Reads skills/move-doctor/SKILL.md from the repo root and emits a TS module
// that exports the contents as a string constant. tsup then bundles that string
// into dist/cli.js, so the install command works without shipping skills/ in
// the published tarball.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(packageDir, "..", "..");
const skillSource = path.join(repoRoot, "skills", "move-doctor", "SKILL.md");
const target = path.join(packageDir, "src", "cli", "skill-content.ts");

const content = await readFile(skillSource, "utf8");
const escaped = content
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const moduleSource = `// GENERATED FILE — do not edit by hand.
// Source: skills/move-doctor/SKILL.md (embedded at build time by scripts/embed-skill.mjs).
// Re-run \`bun scripts/embed-skill.mjs\` (or \`bun run build\`, which calls prebuild) to refresh.

export const SKILL_MD_CONTENT = \`${escaped}\`;
`;

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, moduleSource, "utf8");
console.log(
  `Embedded ${content.length} chars from ${path.relative(repoRoot, skillSource)} → ${path.relative(packageDir, target)}`
);
