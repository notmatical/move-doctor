import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { nonErrorConstNotScreaming } from "./non-error-const-not-screaming.js";

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
    return nonErrorConstNotScreaming
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("conventions/non-error-const-not-screaming (AST)", () => {
  it("flags a PascalCase constant", () => {
    expect(ruleIds("const MaxValue: u64 = 10;")).toEqual([
      "conventions/non-error-const-not-screaming",
    ]);
  });

  it("flags a lowercase constant", () => {
    expect(ruleIds("const max: u64 = 10;")).toHaveLength(1);
  });

  it("flags a mixed-case constant", () => {
    expect(ruleIds("const Max_Value: u64 = 10;")).toHaveLength(1);
  });

  it("does NOT flag SCREAMING_SNAKE_CASE", () => {
    expect(ruleIds("const MAX_VALUE: u64 = 10;")).toEqual([]);
  });

  it("does NOT flag a single-word screaming constant", () => {
    expect(ruleIds("const MAX: u64 = 10;")).toEqual([]);
  });

  it("does NOT flag error constants (handled by sibling rule)", () => {
    expect(ruleIds("const ENotOwner: u64 = 1;")).toEqual([]);
  });

  it("DOES flag a lowercase-after-E name (not an error const)", () => {
    expect(ruleIds("const Ebad: u64 = 1;")).toHaveLength(1);
  });

  it("does NOT match `const` inside a comment", () => {
    expect(ruleIds("// const bad: u64 = 1;\nconst OK_VAL: u64 = 1;")).toEqual(
      []
    );
  });
});
