import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { duplicateErrorCode } from "./duplicate-error-code.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error("Move grammar wasm failed to load");
}

const count = (body: string): number => {
  const src = `module a::m { ${body} }`;
  const tree = parser.parse(src);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return duplicateErrorCode.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("conventions/duplicate-error-code", () => {
  it("flags two error consts sharing a value (both reported)", () => {
    expect(count("const EFoo: u64 = 1; const EBar: u64 = 1;")).toBe(2);
  });

  it("flags duplicate zero codes", () => {
    expect(count("const EA: u64 = 0; const EB: u64 = 0;")).toBe(2);
  });

  it("matches across decimal/hex/suffix forms", () => {
    expect(count("const EA: u64 = 16; const EB: u64 = 0x10u64;")).toBe(2);
  });

  it("does NOT flag distinct values", () => {
    expect(count("const EFoo: u64 = 1; const EBar: u64 = 2;")).toBe(0);
  });

  it("does NOT flag duplicate non-error consts", () => {
    expect(count("const MAX: u64 = 1; const MIN: u64 = 1;")).toBe(0);
  });

  it("does NOT flag a single error const", () => {
    expect(count("const EFoo: u64 = 0;")).toBe(0);
  });
});
