import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { transferInComposable } from "./transfer-in-composable.js";

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
    return transferInComposable
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("functions/transfer-in-composable (AST)", () => {
  it("flags a public composable function calling transfer::transfer", () => {
    expect(
      ruleIds(
        "public fun give(o: Foo, ctx: &mut TxContext) { transfer::transfer(o, tx_context::sender(ctx)); }"
      )
    ).toEqual(["functions/transfer-in-composable"]);
  });

  it("does NOT flag a public entry function (the intended place to transfer)", () => {
    expect(
      ruleIds(
        "public entry fun give(o: Foo, ctx: &mut TxContext) { transfer::transfer(o, @0x1); }"
      )
    ).toEqual([]);
  });

  it("does NOT flag a private function", () => {
    expect(
      ruleIds("fun give(o: Foo) { transfer::transfer(o, @0x1); }")
    ).toEqual([]);
  });

  it("does NOT flag a function that does not call transfer::transfer", () => {
    expect(ruleIds("public fun make(o: Foo): Foo { o }")).toEqual([]);
  });

  it("does NOT flag transfer::public_transfer (different member)", () => {
    expect(
      ruleIds("public fun give(o: Foo) { transfer::public_transfer(o, @0x1); }")
    ).toEqual([]);
  });

  it("does NOT flag a lookalike module path like my_transfer::transfer", () => {
    expect(
      ruleIds("public fun give(o: Foo) { my_transfer::transfer(o, @0x1); }")
    ).toEqual([]);
  });
});
