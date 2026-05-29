import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { leftoverDebugPrint } from "./leftover-debug-print.js";

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
    return leftoverDebugPrint.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("conventions/leftover-debug-print", () => {
  it("flags debug::print", () => {
    expect(count("fun f() { debug::print(&x); }")).toBe(1);
  });

  it("flags fully-qualified std::debug::print", () => {
    expect(count("fun f() { std::debug::print(&x); }")).toBe(1);
  });

  it("does NOT flag a call to another module's print", () => {
    expect(count("fun f() { display::print(&x); }")).toBe(0);
  });

  it("does NOT flag unrelated calls", () => {
    expect(count("fun f() { foo(); }")).toBe(0);
  });
});
