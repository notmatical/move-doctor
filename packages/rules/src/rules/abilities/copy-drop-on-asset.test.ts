import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { copyDropOnAsset } from "./copy-drop-on-asset.js";

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
    return copyDropOnAsset
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("abilities/copy-drop-on-asset (AST)", () => {
  it("flags a copy,drop struct with a UID field", () => {
    expect(ruleIds("public struct Asset has copy, drop { id: UID }")).toEqual([
      "abilities/copy-drop-on-asset",
    ]);
  });

  it("flags a copy,drop struct with a Balance field", () => {
    expect(
      ruleIds(
        "public struct Asset has copy, drop { id: UID, bal: Balance<SUI> }"
      )
    ).toHaveLength(1);
  });

  it("flags a copy,drop struct with a Coin field", () => {
    expect(
      ruleIds("public struct Asset has copy, drop { reserve: Coin<SUI> }")
    ).toHaveLength(1);
  });

  it("flags regardless of ability ordering (drop before copy)", () => {
    expect(
      ruleIds("public struct Asset has drop, copy { id: UID }")
    ).toHaveLength(1);
  });

  it("does NOT flag when only copy is present", () => {
    expect(ruleIds("public struct Asset has copy { id: UID }")).toEqual([]);
  });

  it("does NOT flag when only drop is present", () => {
    expect(ruleIds("public struct Asset has drop { id: UID }")).toEqual([]);
  });

  it("does NOT flag a copy,drop struct without an asset-shaped field", () => {
    expect(
      ruleIds(
        "public struct Snapshot has copy, drop { amount: u64, owner: address }"
      )
    ).toEqual([]);
  });

  it("does NOT flag a key,store asset (the correct shape)", () => {
    expect(ruleIds("public struct Asset has key, store { id: UID }")).toEqual(
      []
    );
  });

  it("does NOT confuse a UID-suffixed name with the UID type", () => {
    expect(
      ruleIds("public struct Snapshot has copy, drop { myUID: u64 }")
    ).toEqual([]);
  });

  it("does NOT flag a positional copy,drop struct (record body only)", () => {
    // The regex rule only inspected record (`{}`) bodies; positional structs
    // were never flagged, so the AST version must match that.
    expect(ruleIds("public struct Wrapper(UID, u64) has copy, drop")).toEqual(
      []
    );
  });
});
