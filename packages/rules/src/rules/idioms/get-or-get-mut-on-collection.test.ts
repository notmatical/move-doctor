import { describe, expect, it } from "bun:test";
import type { Diagnostic } from "core";
import { getMoveParser } from "core";
import { getOrGetMutOnCollection } from "./get-or-get-mut-on-collection.js";

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
    return getOrGetMutOnCollection.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("idioms/get-or-get-mut-on-collection (AST)", () => {
  it("flags .get(&key)", () => {
    const [d] = scan("let v = table.get(&key);");
    expect(d?.ruleId).toBe("idioms/get-or-get-mut-on-collection");
    expect(d?.message).toContain(".get(&key)");
    expect(d?.fixHint).toBe("Prefer `&x[&key]`.");
  });

  it("flags .get_mut(&key) with a mutable suggestion", () => {
    const [d] = scan("let v = table.get_mut(&key);");
    expect(d?.message).toContain(".get_mut(&key)");
    expect(d?.fixHint).toBe("Prefer `&mut x[&key]`.");
  });

  it("flags chained receivers", () => {
    expect(scan("let v = self.table.get(&key);")).toHaveLength(1);
  });

  it("does NOT flag .get without a borrowed key", () => {
    expect(scan("let v = opt.get(key);")).toEqual([]);
    expect(scan("let v = opt.get();")).toEqual([]);
  });

  it("does NOT flag unrelated methods", () => {
    expect(scan("let v = table.contains(&key);")).toEqual([]);
  });

  it("does NOT flag occurrences inside comments or strings", () => {
    expect(scan("// table.get(&key)")).toEqual([]);
    expect(scan('let s = b".get(&key)";')).toEqual([]);
  });
});
