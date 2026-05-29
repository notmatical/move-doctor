#!/usr/bin/env bun

// Rebuilds packages/core/assets/tree-sitter-move.wasm from MystenLabs' in-tree
// Move grammar. This is a MAINTAINER step, not part of `bun run build` — the
// wasm is committed so end users (and CI) never need the tree-sitter toolchain.
//
// Bump GRAMMAR_REF when adopting newer Move syntax, then re-run:
//   node scripts/build-move-grammar.mjs
//
// Requires network (downloads the grammar + a WASI SDK on first run). No Docker
// or Emscripten: tree-sitter-cli >= 0.26.1 builds wasm via the WASI SDK, which
// it auto-downloads. Keep TREE_SITTER_CLI in lockstep with the web-tree-sitter
// runtime version (see packages/core/package.json) to avoid ABI mismatches.

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// pinned to the commit that last touched the grammar. bump deliberately.
const GRAMMAR_REF = "4ba6c1fe30a78be877812cf6619f4a2534cd496d";
const GRAMMAR_URL = `https://raw.githubusercontent.com/MystenLabs/sui/${GRAMMAR_REF}/external-crates/move/tooling/tree-sitter/grammar.js`;
const TREE_SITTER_CLI = "tree-sitter-cli@0.26.9";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const outPath = path.join(
  repoRoot,
  "packages",
  "core",
  "assets",
  "tree-sitter-move.wasm"
);

const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

const main = async () => {
  const work = mkdtempSync(path.join(os.tmpdir(), "move-grammar-"));
  try {
    console.log(`Fetching grammar.js @ ${GRAMMAR_REF.slice(0, 10)}…`);
    const grammar = await fetch(GRAMMAR_URL).then((response) => {
      if (!response.ok) {
        throw new Error(`grammar fetch failed: ${response.status}`);
      }
      return response.text();
    });
    writeFileSync(path.join(work, "grammar.js"), grammar);
    writeFileSync(
      path.join(work, "package.json"),
      `${JSON.stringify(
        {
          name: "tree-sitter-move",
          version: "0.0.0",
          "tree-sitter": [{ scope: "source.move", "file-types": ["move"] }],
        },
        null,
        2
      )}\n`
    );

    console.log("Generating parser + building wasm (WASI SDK auto-downloads)…");
    run("npx", ["--yes", TREE_SITTER_CLI, "generate"], work);
    run("npx", ["--yes", TREE_SITTER_CLI, "build", "--wasm"], work);

    copyFileSync(path.join(work, "tree-sitter-move.wasm"), outPath);
    console.log(`✓ Wrote ${path.relative(repoRoot, outPath)}`);
    console.log("  Commit the updated wasm.");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
