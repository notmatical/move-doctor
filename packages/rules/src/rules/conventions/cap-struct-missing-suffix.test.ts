import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { capStructMissingSuffix } from "./cap-struct-missing-suffix.js";

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
    return capStructMissingSuffix
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("conventions/cap-struct-missing-suffix (AST)", () => {
  it("flags a key,store struct with only id:UID and no Cap suffix", () => {
    expect(ruleIds("public struct Admin has key, store { id: UID }")).toEqual([
      "conventions/cap-struct-missing-suffix",
    ]);
  });

  it("flags a key-only struct (store is not required for a capability)", () => {
    expect(ruleIds("public struct Admin has key { id: UID }")).toHaveLength(1);
  });

  it("flags a qualified UID type", () => {
    expect(
      ruleIds("public struct Admin has key { id: sui::object::UID }")
    ).toHaveLength(1);
  });

  it("flags postfix ability declarations", () => {
    expect(ruleIds("public struct Admin { id: UID } has key;")).toHaveLength(1);
  });

  it("does NOT flag a struct already suffixed Cap", () => {
    expect(
      ruleIds("public struct AdminCap has key, store { id: UID }")
    ).toEqual([]);
  });

  it("does NOT flag an asset-shaped struct with extra fields", () => {
    expect(
      ruleIds("public struct Hero has key, store { id: UID, name: String }")
    ).toEqual([]);
  });

  it("does NOT flag a struct without the key ability", () => {
    expect(ruleIds("public struct Receipt { id: UID }")).toEqual([]);
  });

  it("does NOT flag a non-UID single field", () => {
    expect(ruleIds("public struct Admin has key { id: u64 }")).toEqual([]);
  });
});
