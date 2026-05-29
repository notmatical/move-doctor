import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { initNotPrivate } from "./init-not-private.js";

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
    return initNotPrivate.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("security/init-not-private", () => {
  it("flags a public init", () => {
    expect(count("public fun init(ctx: &mut TxContext) {}")).toBe(1);
  });

  it("flags an entry init with a one-time-witness", () => {
    expect(
      count("public entry fun init(otw: OTW, ctx: &mut TxContext) {}")
    ).toBe(1);
  });

  it("does NOT flag a private init", () => {
    expect(count("fun init(ctx: &mut TxContext) {}")).toBe(0);
  });

  it("does NOT flag an unrelated helper named init", () => {
    expect(count("public fun init(x: u64): u64 { x }")).toBe(0);
  });

  it("does NOT flag a public fn with the init signature but a different name", () => {
    expect(count("public fun setup(ctx: &mut TxContext) {}")).toBe(0);
  });
});
