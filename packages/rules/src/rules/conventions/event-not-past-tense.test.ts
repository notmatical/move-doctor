import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { eventNotPastTense } from "./event-not-past-tense.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error(
    "Move grammar wasm failed to load — build it with `bun run grammar:build` and ensure packages/core/assets/tree-sitter-move.wasm exists."
  );
}

const ruleIds = (src: string): string[] => {
  const wrapped = `module a::m { fun f() { ${src} } }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return eventNotPastTense
      .scanAst({
        file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] },
        tree,
      })
      .map((diagnostic) => diagnostic.ruleId);
  } finally {
    tree.delete();
  }
};

describe("conventions/event-not-past-tense (AST)", () => {
  it("flags a present-tense packed event", () => {
    expect(ruleIds("event::emit(Transfer { a: 1 });")).toEqual([
      "conventions/event-not-past-tense",
    ]);
  });

  it("flags a present-tense type-argument event", () => {
    expect(ruleIds("event::emit<Mint>(x);")).toHaveLength(1);
  });

  it("flags through a qualified path", () => {
    expect(ruleIds("sui::event::emit(Create { a: 1 });")).toHaveLength(1);
  });

  it("does NOT flag a past-tense (-ed) event", () => {
    expect(ruleIds("event::emit(Transferred { a: 1 });")).toEqual([]);
  });

  it("does NOT flag a past-tense (-en) event", () => {
    expect(ruleIds("event::emit<Taken>(x);")).toEqual([]);
  });

  it("does NOT flag a lowercase argument (no capitalized type)", () => {
    expect(ruleIds("event::emit(local_payload);")).toEqual([]);
  });

  it("does NOT flag a non-event emit call", () => {
    expect(ruleIds("my_event::emit(Transfer { a: 1 });")).toEqual([]);
  });

  it("prefers the explicit type argument over the argument", () => {
    expect(ruleIds("event::emit<Created>(payload);")).toEqual([]);
  });

  it("handles multiple emits on separate lines", () => {
    expect(
      ruleIds("event::emit(Transfer { a: 1 });\nevent::emit(Minted { b: 2 });")
    ).toHaveLength(1);
  });
});
