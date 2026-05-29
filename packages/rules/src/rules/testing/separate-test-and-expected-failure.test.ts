import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { separateTestAndExpectedFailure } from "./separate-test-and-expected-failure.js";

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
    return separateTestAndExpectedFailure
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/separate-test-and-expected-failure (AST)", () => {
  it("flags separate `#[test]` then `#[expected_failure(...)]` lines", () => {
    expect(
      ruleIds(
        "#[test]\n#[expected_failure(abort_code = 1)] fun t() { abort 1 }"
      )
    ).toEqual(["testing/separate-test-and-expected-failure"]);
  });

  it("flags a bare `#[expected_failure]` on its own line", () => {
    expect(ruleIds("#[test]\n#[expected_failure] fun t() { abort 1 }")).toEqual(
      ["testing/separate-test-and-expected-failure"]
    );
  });

  it("does NOT flag the combined `#[test, expected_failure(...)]` form", () => {
    expect(
      ruleIds("#[test, expected_failure(abort_code = 1)] fun t() { abort 1 }")
    ).toEqual([]);
  });

  it("does NOT flag a plain `#[test]` alone", () => {
    expect(ruleIds("#[test] fun t() { assert!(cond); }")).toEqual([]);
  });

  it("does NOT flag `#[expected_failure]` alone", () => {
    expect(
      ruleIds("#[expected_failure(abort_code = 1)] fun t() { abort 1 }")
    ).toEqual([]);
  });
});
