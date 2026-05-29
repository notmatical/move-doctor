import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { missingPhantomOnTypedReceipt } from "./missing-phantom-on-typed-receipt.js";

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
    return missingPhantomOnTypedReceipt
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("abilities/missing-phantom-on-typed-receipt (AST)", () => {
  it("flags a generic struct whose type parameter is never used in a field", () => {
    expect(
      ruleIds("public struct Receipt<T> has drop { amount: u64 }")
    ).toEqual(["abilities/missing-phantom-on-typed-receipt"]);
  });

  it("flags each unused generic separately", () => {
    expect(
      ruleIds("public struct Receipt<T, U> has drop { amount: u64 }")
    ).toHaveLength(2);
  });

  it("flags only the unused generic when one is used", () => {
    expect(
      ruleIds("public struct Receipt<T, U> has drop { val: Coin<U> }")
    ).toEqual(["abilities/missing-phantom-on-typed-receipt"]);
  });

  it("does NOT flag when the generic is used directly as a field type", () => {
    expect(ruleIds("public struct Box<T> has drop { val: T }")).toEqual([]);
  });

  it("does NOT flag when the generic is used nested in a field type", () => {
    expect(
      ruleIds("public struct Vault<T> has key { id: UID, coin: Coin<T> }")
    ).toEqual([]);
  });

  it("does NOT flag when the parameter is already phantom", () => {
    expect(
      ruleIds("public struct Receipt<phantom T> has drop { amount: u64 }")
    ).toEqual([]);
  });

  it("does NOT flag a non-generic struct", () => {
    expect(ruleIds("public struct Receipt has drop { amount: u64 }")).toEqual(
      []
    );
  });

  it("does NOT flag a generic struct with no fields", () => {
    expect(ruleIds("public struct Receipt<T> has drop {}")).toEqual([]);
  });

  it("does NOT confuse a substring of the generic name with usage", () => {
    // `T` must not be considered used just because `Ticket` contains a T.
    expect(
      ruleIds("public struct Receipt<T> has drop { kind: Ticket }")
    ).toEqual(["abilities/missing-phantom-on-typed-receipt"]);
  });
});
