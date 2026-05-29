import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { publicShareOfCap } from "./public-share-of-cap.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const run = (body: string): ReturnType<typeof publicShareOfCap.scanAst> => {
  const wrapped = `module a::m { fun f(ctx: &mut TxContext) { ${body} } }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return publicShareOfCap.scanAst({
      file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
      tree,
    });
  } finally {
    tree.delete();
  }
};

describe("security/public-share-of-cap (AST)", () => {
  it("flags a direct share of a Cap struct literal", () => {
    const findings = run(
      "transfer::public_share_object(AdminCap { id: object::new(ctx) });"
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("security/public-share-of-cap");
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toContain('capability "AdminCap"');
  });

  it("flags the non-`public_` share_object variant too", () => {
    expect(
      run("transfer::share_object(AdminCap { id: object::new(ctx) });")
    ).toHaveLength(1);
  });

  it("flags a bound cap variable that is then shared", () => {
    const findings = run(
      "let cap = AdminCap { id: object::new(ctx) }; transfer::public_share_object(cap);"
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('Variable "cap"');
    expect(findings[0]?.message).toContain('type "AdminCap"');
    expect(findings[0]?.fixHint).toContain(
      "transfer::transfer(cap, tx_context::sender(ctx))"
    );
  });

  it("flags a `let mut` bound cap that is shared", () => {
    expect(
      run(
        "let mut cap = OwnerCap { id: object::new(ctx) }; transfer::share_object(cap);"
      )
    ).toHaveLength(1);
  });

  it("does NOT flag transferring the cap to the sender", () => {
    expect(
      run(
        "let cap = AdminCap { id: object::new(ctx) }; transfer::transfer(cap, tx_context::sender(ctx));"
      )
    ).toEqual([]);
  });

  it("does NOT flag sharing a non-cap struct literal", () => {
    expect(
      run("transfer::public_share_object(Registry { id: object::new(ctx) });")
    ).toEqual([]);
  });

  it("does NOT flag sharing a non-cap bound variable", () => {
    expect(
      run(
        "let registry = Registry { id: object::new(ctx) }; transfer::public_share_object(registry);"
      )
    ).toEqual([]);
  });

  it("does NOT flag sharing a variable that was never bound to a cap", () => {
    expect(run("transfer::public_share_object(cap);")).toEqual([]);
  });

  it("does NOT flag a non-transfer module share call", () => {
    expect(
      run("custom::public_share_object(AdminCap { id: object::new(ctx) });")
    ).toEqual([]);
  });

  it("does NOT leak a cap binding from one function into another", () => {
    const wrapped =
      "module a::m { fun a(ctx: &mut TxContext) { let cap = AdminCap { id: object::new(ctx) }; } fun b() { transfer::public_share_object(cap); } }";
    const tree = parser.parse(wrapped);
    if (!tree) {
      throw new Error("parse returned null");
    }
    try {
      expect(
        publicShareOfCap.scanAst({
          file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
          tree,
        })
      ).toEqual([]);
    } finally {
      tree.delete();
    }
  });
});
