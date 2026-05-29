import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { getterUsesGetPrefix } from "./getter-uses-get-prefix.js";

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
    return getterUsesGetPrefix
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("functions/getter-uses-get-prefix (AST)", () => {
  it("flags a public get_ getter over &Self with a return", () => {
    expect(
      ruleIds("public fun get_name(self: &Hero): String { self.name }")
    ).toEqual(["functions/getter-uses-get-prefix"]);
  });

  it("flags a mutable getter and suggests _mut", () => {
    expect(
      ruleIds(
        "public fun get_name(self: &mut Hero): &mut String { &mut self.name }"
      )
    ).toHaveLength(1);
  });

  it("flags when the self param is named differently", () => {
    expect(
      ruleIds("public fun get_value(hero: &Hero): u64 { hero.value }")
    ).toHaveLength(1);
  });

  it("does NOT flag a non-public getter", () => {
    expect(ruleIds("fun get_name(self: &Hero): String { self.name }")).toEqual(
      []
    );
    expect(
      ruleIds("public(package) fun get_name(self: &Hero): String { self.name }")
    ).toEqual([]);
  });

  it("does NOT flag a getter without a return type", () => {
    expect(ruleIds("public fun get_name(self: &Hero) { abort 0 }")).toEqual([]);
  });

  it("does NOT flag a function without the get_ prefix", () => {
    expect(
      ruleIds("public fun name(self: &Hero): String { self.name }")
    ).toEqual([]);
  });

  it("does NOT flag a getter with more than one param", () => {
    expect(
      ruleIds(
        "public fun get_name(self: &Hero, idx: u64): String { self.name }"
      )
    ).toEqual([]);
  });

  it("does NOT flag when the sole param is by-value or primitive", () => {
    expect(
      ruleIds("public fun get_name(self: Hero): String { abort 0 }")
    ).toEqual([]);
    expect(ruleIds("public fun get_name(n: &u64): u64 { *n }")).toEqual([]);
  });
});
