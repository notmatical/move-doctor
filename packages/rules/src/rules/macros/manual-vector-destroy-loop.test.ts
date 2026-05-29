import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { manualVectorDestroyLoop } from "./manual-vector-destroy-loop.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const run = (
  body: string
): ReturnType<typeof manualVectorDestroyLoop.scanAst> => {
  const wrapped = `module a::m { fun f() { ${body} } }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return manualVectorDestroyLoop.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("macros/manual-vector-destroy-loop (AST)", () => {
  it("flags `while (!v.is_empty())` drain loops", () => {
    const findings = run("while (!v.is_empty()) { v.pop_back(); };");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("macros/manual-vector-destroy-loop");
    expect(findings[0]?.message).toContain("while (!v.is_empty())");
    expect(findings[0]?.fixHint).toContain("v.destroy!(|element| ...)");
  });

  it("uses the actual receiver name in the message", () => {
    const findings = run("while (!items.is_empty()) { items.pop_back(); };");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("while (!items.is_empty())");
    expect(findings[0]?.fixHint).toContain("items.destroy!");
  });

  it("does NOT flag `while (v.is_empty())` (no negation)", () => {
    expect(run("while (v.is_empty()) { break };")).toEqual([]);
  });

  it("does NOT flag a negated call to a different method", () => {
    expect(run("while (!v.has_next()) { v.pop_back(); };")).toEqual([]);
  });

  it("does NOT flag a property access `!v.is_empty` without a call", () => {
    // grammar treats `!v.is_empty` (no parens) differently; should not match.
    expect(run("while (!flag) { foo() };")).toEqual([]);
  });

  it("ignores an is_empty drain loop inside a block comment", () => {
    expect(run("/* while (!v.is_empty()) { } */ let x = 1;")).toEqual([]);
  });

  it("flags two distinct drain loops", () => {
    expect(
      run(
        "while (!a.is_empty()) { a.pop_back(); }; while (!b.is_empty()) { b.pop_back(); };"
      )
    ).toHaveLength(2);
  });
});
