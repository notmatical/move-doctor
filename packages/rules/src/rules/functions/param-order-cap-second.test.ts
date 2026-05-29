import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { paramOrderCapSecond } from "./param-order-cap-second.js";

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
    return paramOrderCapSecond
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("functions/param-order-cap-second (AST)", () => {
  it("flags a cap before its &mut target object", () => {
    expect(ruleIds("public fun f(cap: &AdminCap, hero: &mut Hero) {}")).toEqual(
      ["functions/param-order-cap-second"]
    );
  });

  it("flags a qualified cap type", () => {
    expect(
      ruleIds("public fun f(cap: &admin::AdminCap, hero: &mut Hero) {}")
    ).toHaveLength(1);
  });

  it("does NOT flag when the object comes before the cap", () => {
    expect(ruleIds("public fun f(hero: &mut Hero, cap: &AdminCap) {}")).toEqual(
      []
    );
  });

  it("does NOT flag when the later object is not a &mut ref", () => {
    expect(ruleIds("public fun f(cap: &AdminCap, hero: &Hero) {}")).toEqual([]);
    expect(ruleIds("public fun f(cap: &AdminCap, hero: Hero) {}")).toEqual([]);
  });

  it("does NOT treat &mut TxContext or &mut Clock as a target object", () => {
    expect(
      ruleIds("public fun f(cap: &AdminCap, ctx: &mut TxContext) {}")
    ).toEqual([]);
    expect(
      ruleIds("public fun f(cap: &AdminCap, clock: &mut Clock) {}")
    ).toEqual([]);
  });

  it("does NOT flag a non-public function", () => {
    expect(
      ruleIds("public(package) fun f(cap: &AdminCap, hero: &mut Hero) {}")
    ).toEqual([]);
  });

  it("does NOT flag a function without a cap param", () => {
    expect(ruleIds("public fun f(sword: &Sword, hero: &mut Hero) {}")).toEqual(
      []
    );
  });
});
