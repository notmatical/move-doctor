import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { dynamicFieldKeyMissingSuffix } from "./dynamic-field-key-missing-suffix.js";

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
    return dynamicFieldKeyMissingSuffix
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("conventions/dynamic-field-key-missing-suffix (AST)", () => {
  it("flags a positional struct without a Key suffix", () => {
    expect(
      ruleIds("public struct Marker(address) has copy, drop, store;")
    ).toEqual(["conventions/dynamic-field-key-missing-suffix"]);
  });

  it("flags a single-element positional struct", () => {
    expect(
      ruleIds("public struct Wrapper(u64) has copy, drop, store;")
    ).toHaveLength(1);
  });

  it("does NOT flag a positional struct already suffixed Key", () => {
    expect(
      ruleIds("public struct MarkerKey(address) has copy, drop, store;")
    ).toEqual([]);
  });

  it("does NOT flag a named (record) struct", () => {
    expect(
      ruleIds("public struct Marker has copy, drop, store { x: u64 }")
    ).toEqual([]);
  });

  it("does NOT flag an empty struct", () => {
    expect(ruleIds("public struct Marker has drop;")).toEqual([]);
  });

  it("does NOT match a positional struct in a comment", () => {
    expect(
      ruleIds(
        "// public struct Marker(address)\npublic struct OkKey(u64) has copy;"
      )
    ).toEqual([]);
  });

  it("handles multiple positional structs", () => {
    expect(
      ruleIds(
        "public struct A(u64) has copy; public struct BKey(u64) has copy; public struct C(address) has drop;"
      )
    ).toHaveLength(2);
  });
});
