import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { useTestUtilsDestroy } from "./use-test-utils-destroy.js";

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
    return useTestUtilsDestroy
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/use-test-utils-destroy (AST)", () => {
  it("flags `x.destroy_for_testing()`", () => {
    expect(ruleIds("fun f() { x.destroy_for_testing(); }")).toEqual([
      "testing/use-test-utils-destroy",
    ]);
  });

  it("flags it regardless of being inside a test", () => {
    expect(ruleIds("#[test] fun f() { obj.destroy_for_testing(); }")).toEqual([
      "testing/use-test-utils-destroy",
    ]);
  });

  it("flags each occurrence", () => {
    expect(
      ruleIds("fun f() { a.destroy_for_testing(); b.destroy_for_testing(); }")
    ).toHaveLength(2);
  });

  it("does NOT flag an unrelated method call", () => {
    expect(ruleIds("fun f() { x.destroy(); }")).toEqual([]);
  });

  it("does NOT flag a destroy_for_testing call with arguments", () => {
    expect(ruleIds("fun f() { x.destroy_for_testing(y); }")).toEqual([]);
  });
});
