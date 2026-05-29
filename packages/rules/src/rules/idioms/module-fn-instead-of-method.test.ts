import { describe, expect, it } from "bun:test";
import type { Diagnostic } from "core";
import { getMoveParser } from "core";
import { moduleFnInsteadOfMethod } from "./module-fn-instead-of-method.js";

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
    return moduleFnInsteadOfMethod.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("idioms/module-fn-instead-of-method (AST)", () => {
  it("flags tx_context::sender with receiver-aware suggestion + citation", () => {
    const [d] = scan("let s = tx_context::sender(ctx);");
    expect(d?.ruleId).toBe("idioms/module-fn-instead-of-method");
    expect(d?.citation).toBe("Move Book: ctx has sender()");
    expect(d?.fixHint).toBe("Use `ctx.sender()`.");
  });

  it("flags object::delete with receiver name", () => {
    const [d] = scan("object::delete(id);");
    expect(d?.citation).toBe("Move Book: UID has delete");
    expect(d?.fixHint).toBe("Use `id.delete()`.");
  });

  it("flags vector::push_back / length / pop_back / is_empty (§22)", () => {
    expect(scan("vector::push_back(v, x);")[0]?.citation).toBe(
      "Move Book: Vector Has a Literal. And Associated Functions"
    );
    expect(scan("let n = vector::length(v);")[0]?.fixHint).toBe(
      "Use `vec.length()`."
    );
    expect(scan("vector::pop_back(v);")).toHaveLength(1);
    expect(scan("let b = vector::is_empty(v);")).toHaveLength(1);
  });

  it("flags vector::empty() only at arity 0", () => {
    const [d] = scan("let z = vector::empty();");
    expect(d?.fixHint).toBe("Use `vector[]`.");
    expect(d?.message).toContain("vector::empty()");
  });

  it("flags coin::split / value / into_balance (§18)", () => {
    expect(scan("let c = coin::split(coin, amount, ctx);")[0]?.citation).toBe(
      "Move Book: Common Coin Operations"
    );
    expect(scan("let v = coin::value(coin);")[0]?.fixHint).toBe(
      "Use `coin.value()`."
    );
    expect(scan("let b = coin::into_balance(coin);")).toHaveLength(1);
  });

  it("does NOT flag the already-method form", () => {
    expect(scan("ctx.sender();")).toEqual([]);
    expect(scan("v.push_back(x);")).toEqual([]);
  });

  it("does NOT flag unrelated module functions", () => {
    expect(scan("balance::value(b);")).toEqual([]);
    expect(scan("vector::contains(v, x);")).toEqual([]);
  });

  it("does NOT flag occurrences inside comments or strings", () => {
    expect(scan("// tx_context::sender(ctx)")).toEqual([]);
    expect(scan('let s = b"vector::push_back(";')).toEqual([]);
  });
});
