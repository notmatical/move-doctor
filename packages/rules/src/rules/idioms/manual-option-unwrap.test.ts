import { describe, expect, it } from "bun:test";
import type { Diagnostic } from "core";
import { getMoveParser } from "core";
import { manualOptionUnwrap } from "./manual-option-unwrap.js";

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
    return manualOptionUnwrap.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("idioms/manual-option-unwrap (AST)", () => {
  it("flags if (opt.is_some()) with the option name in the message", () => {
    const [d] = scan("if (opt.is_some()) { abort 0 };");
    expect(d?.ruleId).toBe("idioms/manual-option-unwrap");
    expect(d?.message).toContain("if (opt.is_some())");
    expect(d?.fixHint).toContain("opt.do!(|value| ...)");
    expect(d?.fixHint).toContain("opt.destroy_or!(default)");
  });

  it("uses the actual receiver name", () => {
    expect(scan("if (maybe_val.is_some()) { abort 0 };")[0]?.message).toContain(
      "maybe_val.is_some()"
    );
  });

  it("does NOT flag is_none", () => {
    expect(scan("if (opt.is_none()) { abort 0 };")).toEqual([]);
  });

  it("does NOT flag is_some used outside an if condition", () => {
    expect(scan("let b = opt.is_some();")).toEqual([]);
  });

  it("does NOT flag a complex (non-bare-variable) condition", () => {
    // The receiver is a method call, not a simple variable — original regex
    // required `if (<ident>.is_some())`.
    expect(scan("if (get_opt().is_some()) { abort 0 };")).toEqual([]);
  });

  it("does NOT flag occurrences inside comments or strings", () => {
    expect(scan("// if (opt.is_some())")).toEqual([]);
    expect(scan('let s = b"if (opt.is_some())";')).toEqual([]);
  });
});
