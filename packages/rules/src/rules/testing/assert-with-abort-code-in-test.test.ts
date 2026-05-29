import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { assertWithAbortCodeInTest } from "./assert-with-abort-code-in-test.js";

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
    return assertWithAbortCodeInTest
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/assert-with-abort-code-in-test (AST)", () => {
  it("flags `assert!(cond, 5)` inside a #[test]", () => {
    expect(ruleIds("#[test] fun t() { assert!(cond, 5); }")).toEqual([
      "testing/assert-with-abort-code-in-test",
    ]);
  });

  it("flags `assert!(a == b, 5)` (also has an abort code)", () => {
    expect(ruleIds("#[test] fun t() { assert!(a == b, 5); }")).toEqual([
      "testing/assert-with-abort-code-in-test",
    ]);
  });

  it("does NOT flag a bare `assert!(cond)` without a code", () => {
    expect(ruleIds("#[test] fun t() { assert!(cond); }")).toEqual([]);
  });

  it("does NOT flag `assert_eq!(a, b)` (two non-numeric args)", () => {
    expect(ruleIds("#[test] fun t() { assert_eq!(a, b); }")).toEqual([]);
  });

  it("does NOT flag `assert!` outside a test function", () => {
    expect(ruleIds("fun t() { assert!(cond, 5); }")).toEqual([]);
  });

  it("does NOT flag when the second arg is non-numeric", () => {
    expect(ruleIds("#[test] fun t() { assert!(cond, ECode); }")).toEqual([]);
  });
});
