import { describe, expect, it } from "bun:test";
import type { MoveFile } from "core";
import { importStdStringUtf8 } from "./import-std-string-utf8.js";

const f = (source: string): MoveFile => ({
  filePath: "/tmp/x.move",
  source,
  lines: source.split(/\r?\n/),
});

// module-fn-instead-of-method, get-or-get-mut-on-collection,
// vector-borrow-instead-of-index, and manual-option-unwrap were migrated to
// AST rules; their coverage lives in the per-rule `*.test.ts` files. Only the
// still-regex import-std-string-utf8 rule is exercised here.
describe("idioms/import-std-string-utf8", () => {
  it("flags `use std::string::utf8`", () => {
    expect(
      importStdStringUtf8.scan(f("use std::string::utf8;\n"))
    ).toHaveLength(1);
  });
  it("does NOT flag `use std::string::String`", () => {
    expect(importStdStringUtf8.scan(f("use std::string::String;\n"))).toEqual(
      []
    );
  });
});
