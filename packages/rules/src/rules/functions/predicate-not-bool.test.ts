import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { predicateNotBool } from "./predicate-not-bool.js";

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
    return predicateNotBool.scanAst({
      file: { filePath: "/x.move", source: src, lines: [src] },
      tree,
    }).length;
  } finally {
    tree.delete();
  }
};

describe("functions/predicate-not-bool", () => {
  it("flags an is_ predicate returning a non-bool", () => {
    expect(count("fun is_owner(): u64 { 0 }")).toBe(1);
  });

  it("flags a has_ predicate with no return type", () => {
    expect(count("fun has_access() {}")).toBe(1);
  });

  it("does NOT flag a predicate returning bool", () => {
    expect(count("fun is_owner(): bool { true }")).toBe(0);
  });

  it("does NOT flag a can_ predicate returning bool", () => {
    expect(count("fun can_borrow(): bool { true }")).toBe(0);
  });

  it("does NOT flag a non-predicate name", () => {
    expect(count("fun balance(): u64 { 0 }")).toBe(0);
  });
});
