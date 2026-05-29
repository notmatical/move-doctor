import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { recursiveFunctionCall } from "./recursive-function-call.js";

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
    return recursiveFunctionCall.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("functions/recursive-function-call", () => {
  it("flags a directly self-recursive function", () => {
    expect(count("fun f() { f() }")).toBe(1);
  });

  it("flags self-recursion with arguments", () => {
    expect(count("fun sum(n: u64): u64 { sum(n - 1) }")).toBe(1);
  });

  it("does NOT flag a call to a different function", () => {
    expect(count("fun f() { g() } fun g() {}")).toBe(0);
  });

  it("does NOT flag a qualified call to a same-named fn in another module", () => {
    expect(count("fun f() { other::f() }")).toBe(0);
  });

  it("flags only the recursive function when mixed", () => {
    expect(count("fun rec() { rec() } fun plain() { rec() }")).toBe(1);
  });
});
