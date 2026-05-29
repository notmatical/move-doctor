import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { unusedConst } from "./unused-const.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error("Move grammar wasm failed to load");
}

const names = (body: string): string[] => {
  const src = `module a::m { ${body} }`;
  const tree = parser.parse(src);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return unusedConst
      .scanAst({
        file: { filePath: "/x.move", source: src, lines: [src] },
        tree,
      })
      .map((d) => d.message);
  } finally {
    tree.delete();
  }
};

describe("conventions/unused-const", () => {
  it("flags a const that is never referenced", () => {
    expect(names("const EFoo: u64 = 1;")).toHaveLength(1);
  });

  it("does NOT flag a const used in an assert", () => {
    expect(
      names("const EFoo: u64 = 1; fun f(x: bool) { assert!(x, EFoo); }")
    ).toEqual([]);
  });

  it("does NOT flag a const used in an abort", () => {
    expect(names("const EBad: u64 = 7; fun f() { abort EBad }")).toEqual([]);
  });

  it("does NOT flag a const used as a value", () => {
    expect(names("const MAX: u64 = 10; fun f(): u64 { MAX }")).toEqual([]);
  });

  it("flags only the unused one when mixed", () => {
    expect(
      names("const USED: u64 = 1; const DEAD: u64 = 2; fun f(): u64 { USED }")
    ).toHaveLength(1);
  });
});
