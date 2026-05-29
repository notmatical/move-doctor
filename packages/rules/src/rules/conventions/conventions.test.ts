import { describe, expect, it } from "bun:test";
import type { MoveFile } from "core";
import { javadocStyleDocComment } from "./javadoc-style-doc-comment.js";
import { moduleUsesBraceSyntax } from "./module-uses-brace-syntax.js";
import { ungroupedPackageImports } from "./ungrouped-package-imports.js";
import { useSelfOnly } from "./use-self-only.js";
import { useSplitImport } from "./use-split-import.js";

// Naming + struct-shape conventions rules (error-const, non-error-const,
// potato-in-type-name, event-not-past-tense, dynamic-field-key,
// cap-struct-missing-suffix) were migrated to AST rules; their coverage lives in
// the per-rule `*.test.ts` files. Only still-regex layout/import/comment rules
// are exercised here.

const f = (source: string): MoveFile => ({
  filePath: "/tmp/x.move",
  source,
  lines: source.split(/\r?\n/),
});

describe("conventions/module-uses-brace-syntax", () => {
  it("flags brace-form module", () => {
    expect(
      moduleUsesBraceSyntax.scan(f("module a::b {\n  public fun x() {}\n}\n"))
    ).toHaveLength(1);
  });
  it("does NOT flag label-form module", () => {
    expect(
      moduleUsesBraceSyntax.scan(f("module a::b;\npublic fun x() {}\n"))
    ).toEqual([]);
  });
});

describe("conventions/use-self-only", () => {
  it("flags `use a::b::{Self}`", () => {
    expect(useSelfOnly.scan(f("use a::b::{Self};\n"))).toHaveLength(1);
  });
  it("does NOT flag `use a::b::{Self, C}`", () => {
    expect(useSelfOnly.scan(f("use a::b::{Self, C};\n"))).toEqual([]);
  });
});

describe("conventions/use-split-import (same module twice)", () => {
  it("flags the same module imported on two lines", () => {
    expect(
      useSplitImport.scan(f("use sui::table;\nuse sui::table::Table;\n"))
    ).toHaveLength(1);
  });
  it("does NOT flag distinct modules", () => {
    expect(useSplitImport.scan(f("use sui::table;\nuse sui::coin;\n"))).toEqual(
      []
    );
  });
});

describe("conventions/ungrouped-package-imports (same package, diff modules)", () => {
  it("flags two sui:: imports on separate lines", () => {
    expect(
      ungroupedPackageImports.scan(
        f("use sui::clock::Clock;\nuse sui::coin::Coin;\n")
      )
    ).toHaveLength(1);
  });
  it("does NOT flag a single grouped import", () => {
    expect(
      ungroupedPackageImports.scan(
        f("use sui::{\n  clock::Clock,\n  coin::Coin,\n};\n")
      )
    ).toEqual([]);
  });
});

describe("conventions/javadoc-style-doc-comment", () => {
  it("flags a /** */ block", () => {
    expect(
      javadocStyleDocComment.scan(f("/**\n * hi\n */\npublic fun x() {}\n"))
    ).toHaveLength(1);
  });
  it("does NOT flag /// doc comments", () => {
    expect(
      javadocStyleDocComment.scan(f("/// hi\npublic fun x() {}\n"))
    ).toEqual([]);
  });
});
