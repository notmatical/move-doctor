import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { errorConstNotEpascalcase } from "./error-const-not-epascalcase.js";

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
    return errorConstNotEpascalcase
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("conventions/error-const-not-epascalcase (AST)", () => {
  it("flags SCREAMING_SNAKE error constant", () => {
    expect(ruleIds("const ENOT_OWNER: u64 = 1;")).toEqual([
      "conventions/error-const-not-epascalcase",
    ]);
  });

  it("flags a lowercase-second-char E name", () => {
    expect(ruleIds("const Ebad: u64 = 2;")).toHaveLength(1);
  });

  it("flags an E-prefixed name with underscore", () => {
    expect(ruleIds("const E_Bad: u64 = 3;")).toHaveLength(1);
  });

  it("does NOT flag a well-formed EPascalCase constant", () => {
    expect(ruleIds("const ENotAuthorized: u64 = 1;")).toEqual([]);
  });

  it("does NOT flag a single bare E followed by uppercase", () => {
    expect(ruleIds("const ENotOwner: u64 = 7;")).toEqual([]);
  });

  it("does NOT flag non-error constants", () => {
    expect(ruleIds("const MAX_VALUE: u64 = 10;")).toEqual([]);
  });

  it("does NOT match `const` inside a comment", () => {
    expect(ruleIds("// const Ebad: u64 = 1;\nconst OK: u64 = 1;")).toEqual([]);
  });

  it("handles multiple constants", () => {
    expect(
      ruleIds("const ENotOwner: u64 = 1; const Ebad: u64 = 2;")
    ).toHaveLength(1);
  });
});
