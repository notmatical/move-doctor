import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { assertEqualityNotAssertEq } from "./assert-equality-not-assert-eq.js";

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
    return assertEqualityNotAssertEq
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/assert-equality-not-assert-eq (AST)", () => {
  it("flags `assert!(a == b)` inside a #[test]", () => {
    expect(ruleIds("#[test] fun t() { assert!(a == b); }")).toEqual([
      "testing/assert-equality-not-assert-eq",
    ]);
  });

  it("flags `assert!(a == b, 5)` with a trailing abort code", () => {
    expect(ruleIds("#[test] fun t() { assert!(a == b, 5); }")).toEqual([
      "testing/assert-equality-not-assert-eq",
    ]);
  });

  it("does NOT flag `assert_eq!(a, b)`", () => {
    expect(ruleIds("#[test] fun t() { assert_eq!(a, b); }")).toEqual([]);
  });

  it("does NOT flag a non-equality comparison `assert!(a != b)`", () => {
    expect(ruleIds("#[test] fun t() { assert!(a != b); }")).toEqual([]);
  });

  it("does NOT flag a plain boolean assert", () => {
    expect(ruleIds("#[test] fun t() { assert!(cond); }")).toEqual([]);
  });

  it("does NOT flag `assert!(a == b)` outside a test function", () => {
    expect(ruleIds("fun t() { assert!(a == b); }")).toEqual([]);
  });

  it("flags each occurrence within a test", () => {
    expect(
      ruleIds("#[test] fun t() { assert!(a == b); assert!(c == d); }")
    ).toHaveLength(2);
  });
});
