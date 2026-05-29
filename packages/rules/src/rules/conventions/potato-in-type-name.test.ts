import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { potatoInTypeName } from "./potato-in-type-name.js";

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
    return potatoInTypeName
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("conventions/potato-in-type-name (AST)", () => {
  it("flags a struct with Potato suffix", () => {
    expect(ruleIds("public struct HotPotato {}")).toEqual([
      "conventions/potato-in-type-name",
    ]);
  });

  it("flags Potato anywhere in the name", () => {
    expect(ruleIds("public struct PotatoReceipt has drop { x: u64 }")).toEqual([
      "conventions/potato-in-type-name",
    ]);
  });

  it("flags a positional Potato struct", () => {
    expect(ruleIds("public struct Potato(u64) has drop;")).toHaveLength(1);
  });

  it("does NOT flag a struct without Potato", () => {
    expect(ruleIds("public struct Receipt has drop {}")).toEqual([]);
  });

  it("is case-sensitive (lowercase potato in name not matched)", () => {
    expect(ruleIds("public struct Hotpotato {}")).toEqual([]);
  });

  it("does NOT match Potato in a comment", () => {
    expect(
      ruleIds("// public struct HotPotato {}\npublic struct Ok {}")
    ).toEqual([]);
  });

  it("handles multiple structs", () => {
    expect(
      ruleIds("public struct HotPotato {} public struct SafePotato has drop {}")
    ).toHaveLength(2);
  });
});
