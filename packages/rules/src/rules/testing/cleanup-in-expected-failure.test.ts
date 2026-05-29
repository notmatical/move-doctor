import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { cleanupInExpectedFailure } from "./cleanup-in-expected-failure.js";

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
    return cleanupInExpectedFailure
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/cleanup-in-expected-failure (AST)", () => {
  it("flags `test.end()` in an #[expected_failure] test", () => {
    expect(
      ruleIds("#[expected_failure(abort_code = 1)] fun t() { test.end(); }")
    ).toEqual(["testing/cleanup-in-expected-failure"]);
  });

  it("flags `test_scenario::end(s)` in an #[expected_failure] test", () => {
    expect(
      ruleIds("#[expected_failure] fun t() { test_scenario::end(s); }")
    ).toEqual(["testing/cleanup-in-expected-failure"]);
  });

  it("flags the combined `#[test, expected_failure(...)]` form", () => {
    expect(
      ruleIds(
        "#[test, expected_failure(abort_code = 1)] fun t() { test.end(); }"
      )
    ).toEqual(["testing/cleanup-in-expected-failure"]);
  });

  it("does NOT flag an expected_failure test with no cleanup", () => {
    expect(
      ruleIds("#[expected_failure(abort_code = 1)] fun t() { abort 1 }")
    ).toEqual([]);
  });

  it("does NOT flag `test.end()` in a plain #[test] (no expected_failure)", () => {
    expect(ruleIds("#[test] fun t() { test.end(); }")).toEqual([]);
  });

  it("does NOT flag a non-end method call", () => {
    expect(
      ruleIds("#[expected_failure] fun t() { test.next_tx(@0); }")
    ).toEqual([]);
  });
});
