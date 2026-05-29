import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { manualWhileLoop } from "./manual-while-loop.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const run = (body: string): ReturnType<typeof manualWhileLoop.scanAst> => {
  const wrapped = `module a::m { fun f() { ${body} } }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return manualWhileLoop.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("macros/manual-while-loop (AST)", () => {
  it("flags a fixed-count `while (i < 32)` with do!/tabulate! hint", () => {
    const findings = run("while (i < 32) { i = i + 1 };");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("macros/manual-while-loop");
    expect(findings[0]?.fixHint).toContain("32.do!");
    expect(findings[0]?.fixHint).toContain("vector::tabulate!(32");
    expect(findings[0]?.message).toContain("while (i < 32)");
  });

  it("flags a length-bound loop with the do_ref!/fold!/filter! hint", () => {
    const findings = run("while (i < v.length()) { i = i + 1 };");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.fixHint).toContain("do_ref!");
    expect(findings[0]?.fixHint).toContain("fold!");
    expect(findings[0]?.fixHint).toContain("filter!");
  });

  it("flags an identifier upper bound", () => {
    const findings = run("while (i < n) { i = i + 1 };");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.fixHint).toContain("n.do!");
  });

  it("does NOT flag `while (true)`", () => {
    expect(run("while (true) { break };")).toEqual([]);
  });

  it("does NOT flag a non-`<` comparison", () => {
    expect(run("while (i > 0) { i = i - 1 };")).toEqual([]);
    expect(run("while (i <= n) { i = i + 1 };")).toEqual([]);
  });

  it("does NOT flag a property access without a call (`v.length`)", () => {
    expect(run("while (i < v.length) { i = i + 1 };")).toEqual([]);
  });

  it("does NOT flag a non-name lhs", () => {
    expect(run("while (a.b < n) { foo() };")).toEqual([]);
  });

  it("ignores a `while (i < 8)` written inside a comment", () => {
    expect(run("// while (i < 8) { };\nlet x = 1;")).toEqual([]);
  });

  it("flags two distinct index loops", () => {
    expect(
      run("while (i < 4) { i = i + 1 }; while (j < m) { j = j + 1 };")
    ).toHaveLength(2);
  });
});
