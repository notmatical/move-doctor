import { readFileSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const pkgVersion = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
).version as string;

// The Move grammar wasm ships next to the bundled CLI; move-parser.ts resolves
// it via `./tree-sitter-move.wasm` relative to dist/cli.js at runtime.
const copyGrammarWasm = async (): Promise<void> => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  await copyFile(
    path.join(here, "..", "core", "assets", "tree-sitter-move.wasm"),
    path.join(here, "dist", "tree-sitter-move.wasm")
  );
};

export default defineConfig({
  entry: { cli: "src/cli/main.ts" },
  format: ["esm"],
  target: "node20",
  platform: "node",
  noExternal: [/^@move-doctor\//],
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
  define: { "process.env.MOVE_DOCTOR_VERSION": JSON.stringify(pkgVersion) },
  outDir: "dist",
  onSuccess: copyGrammarWasm,
});
