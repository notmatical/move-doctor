import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { publicEntryCombined } from "./public-entry-combined.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const ruleIds = (src: string): string[] => {
  const wrapped = `module a::m { ${src} }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return publicEntryCombined
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("functions/public-entry-combined (AST)", () => {
  it("flags a public entry function", () => {
    expect(ruleIds("public entry fun mint(ctx: &mut TxContext) {}")).toEqual([
      "functions/public-entry-combined",
    ]);
  });

  it("flags regardless of modifier order", () => {
    expect(ruleIds("entry public fun mint() {}")).toHaveLength(1);
  });

  it("does NOT flag a plain public function", () => {
    expect(ruleIds("public fun mint() {}")).toEqual([]);
  });

  it("does NOT flag a private entry function", () => {
    expect(ruleIds("entry fun mint() {}")).toEqual([]);
  });

  it("does NOT flag a public(package) entry function", () => {
    expect(ruleIds("public(package) entry fun mint() {}")).toEqual([]);
  });
});
