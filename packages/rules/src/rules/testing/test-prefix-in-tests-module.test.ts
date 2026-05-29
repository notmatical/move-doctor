import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { testPrefixInTestsModule } from "./test-prefix-in-tests-module.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const ruleIds = (
  src: string,
  filePath = "/pkg/tests/m_tests.move"
): string[] => {
  const wrapped = `module a::m { ${src} }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return testPrefixInTestsModule
      .scanAst({
        file: { filePath, source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/test-prefix-in-tests-module (AST)", () => {
  it("flags a `test_`-prefixed test in a *_tests.move file", () => {
    expect(ruleIds("#[test] fun test_foo() { assert!(x); }")).toEqual([
      "testing/test-prefix-in-tests-module",
    ]);
  });

  it("flags a `test_`-prefixed test in a tests/ directory file", () => {
    expect(
      ruleIds("#[test] fun test_foo() { assert!(x); }", "/pkg/tests/foo.move")
    ).toEqual(["testing/test-prefix-in-tests-module"]);
  });

  it("does NOT flag a test without the test_ prefix", () => {
    expect(ruleIds("#[test] fun foo() { assert!(x); }")).toEqual([]);
  });

  it("does NOT flag a non-test function even if prefixed", () => {
    expect(ruleIds("fun test_foo() { assert!(x); }")).toEqual([]);
  });

  it("does NOT flag when the file is not a tests module", () => {
    expect(
      ruleIds("#[test] fun test_foo() { assert!(x); }", "/pkg/sources/m.move")
    ).toEqual([]);
  });
});
