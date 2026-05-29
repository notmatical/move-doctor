import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { paramOrderObjectsFirst } from "./param-order-objects-first.js";

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
    return paramOrderObjectsFirst
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("functions/param-order-objects-first (AST)", () => {
  it("flags a primitive before a later object ref", () => {
    expect(ruleIds("public fun f(amount: u64, hero: &mut Hero) {}")).toEqual([
      "functions/param-order-objects-first",
    ]);
  });

  it("flags a primitive before a by-value object", () => {
    expect(ruleIds("public fun f(amount: u64, hero: Hero) {}")).toHaveLength(1);
  });

  it("does NOT flag when objects come first", () => {
    expect(ruleIds("public fun f(hero: &mut Hero, amount: u64) {}")).toEqual(
      []
    );
  });

  it("does NOT treat Clock or TxContext as objects", () => {
    expect(
      ruleIds(
        "public fun f(amount: u64, clock: &Clock, ctx: &mut TxContext) {}"
      )
    ).toEqual([]);
  });

  it("does NOT treat vector as an object", () => {
    expect(ruleIds("public fun f(amount: u64, data: vector<u8>) {}")).toEqual(
      []
    );
  });

  it("does NOT flag a non-public function", () => {
    expect(
      ruleIds("public(package) fun f(amount: u64, hero: &mut Hero) {}")
    ).toEqual([]);
  });

  it("does NOT flag a function with fewer than two params", () => {
    expect(ruleIds("public fun f(amount: u64) {}")).toEqual([]);
  });

  it("does NOT flag when no primitive precedes an object", () => {
    expect(ruleIds("public fun f(hero: &mut Hero, sword: &Sword) {}")).toEqual(
      []
    );
  });
});
