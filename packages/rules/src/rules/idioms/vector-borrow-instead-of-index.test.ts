import { describe, expect, it } from "bun:test";
import type { Diagnostic } from "core";
import { getMoveParser } from "core";
import { vectorBorrowInsteadOfIndex } from "./vector-borrow-instead-of-index.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const scan = (src: string): Diagnostic[] => {
  const wrapped = `module a::m { fun f() { ${src} } }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return vectorBorrowInsteadOfIndex.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("idioms/vector-borrow-instead-of-index (AST)", () => {
  it("flags vector::borrow with an immutable suggestion", () => {
    const [d] = scan("let r = vector::borrow(v, i);");
    expect(d?.ruleId).toBe("idioms/vector-borrow-instead-of-index");
    expect(d?.message).toBe(
      "`vector::borrow` has an index-syntax form in Move 2024."
    );
    expect(d?.fixHint).toBe("Use `&v[index]`.");
  });

  it("flags vector::borrow_mut with a mutable suggestion", () => {
    const [d] = scan("let r = vector::borrow_mut(v, i);");
    expect(d?.message).toBe(
      "`vector::borrow_mut` has an index-syntax form in Move 2024."
    );
    expect(d?.fixHint).toBe("Use `&mut v[index]`.");
  });

  it("does NOT flag the method form .borrow()", () => {
    expect(scan("let r = v.borrow(i);")).toEqual([]);
  });

  it("does NOT flag a different module's borrow", () => {
    expect(scan("let r = table::borrow(t, k);")).toEqual([]);
  });

  it("does NOT flag other vector functions", () => {
    expect(scan("let r = vector::contains(v, x);")).toEqual([]);
  });

  it("does NOT flag occurrences inside comments or strings", () => {
    expect(scan("// vector::borrow(v, i)")).toEqual([]);
    expect(scan('let s = b"vector::borrow_mut(";')).toEqual([]);
  });
});
