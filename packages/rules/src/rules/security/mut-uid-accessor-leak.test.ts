import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { mutUidAccessorLeak } from "./mut-uid-accessor-leak.js";

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
    return mutUidAccessorLeak.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("security/mut-uid-accessor-leak", () => {
  it("flags a public fn returning `&mut UID`", () => {
    expect(count("public fun uid_mut(s: &mut S): &mut UID { &mut s.id }")).toBe(
      1
    );
  });

  it("flags a qualified `&mut object::UID` return", () => {
    expect(
      count("public fun uid_mut(s: &mut S): &mut object::UID { &mut s.id }")
    ).toBe(1);
  });

  it("does NOT flag an immutable `&UID` return", () => {
    expect(count("public fun uid(s: &S): &UID { &s.id }")).toBe(0);
  });

  it("does NOT flag a non-public fn", () => {
    expect(count("fun uid_mut(s: &mut S): &mut UID { &mut s.id }")).toBe(0);
  });

  it("does NOT flag a public fn returning something else", () => {
    expect(count("public fun val(s: &S): u64 { 0 }")).toBe(0);
  });
});
