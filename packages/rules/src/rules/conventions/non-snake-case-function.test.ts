import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { nonSnakeCaseFunction } from "./non-snake-case-function.js";

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
    return nonSnakeCaseFunction.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("conventions/non-snake-case-function", () => {
  it("flags camelCase", () => {
    expect(count("fun getBalance() {}")).toBe(1);
  });

  it("flags PascalCase", () => {
    expect(count("fun GetBalance() {}")).toBe(1);
  });

  it("does NOT flag snake_case", () => {
    expect(count("fun get_balance() {}")).toBe(0);
  });

  it("does NOT flag a single lowercase word", () => {
    expect(count("fun balance() {}")).toBe(0);
  });
});
