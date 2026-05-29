import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { unnecessaryTestScenario } from "./unnecessary-test-scenario.js";

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
    return unnecessaryTestScenario
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("testing/unnecessary-test-scenario (AST)", () => {
  it("flags a test that only `begin`s/`end`s a scenario", () => {
    expect(
      ruleIds(
        "#[test] fun t() { let mut s = test_scenario::begin(@0); test_scenario::end(s); }"
      )
    ).toEqual(["testing/unnecessary-test-scenario"]);
  });

  it("does NOT flag when the scenario uses next_tx", () => {
    expect(
      ruleIds(
        "#[test] fun t() { let mut s = test_scenario::begin(@0); test_scenario::next_tx(&mut s, @0); test_scenario::end(s); }"
      )
    ).toEqual([]);
  });

  it("does NOT flag when the scenario uses take_from_sender", () => {
    expect(
      ruleIds(
        "#[test] fun t() { let mut s = test_scenario::begin(@0); test_scenario::take_from_sender(&s); test_scenario::end(s); }"
      )
    ).toEqual([]);
  });

  it("does NOT flag a test that never calls test_scenario::begin", () => {
    expect(
      ruleIds("#[test] fun t() { let ctx = tx_context::dummy(); }")
    ).toEqual([]);
  });

  it("does NOT flag scenario usage outside a test function", () => {
    expect(ruleIds("fun t() { let s = test_scenario::begin(@0); }")).toEqual(
      []
    );
  });
});
