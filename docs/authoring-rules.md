# Authoring a Move Doctor rule

A rule is one TypeScript file under `packages/rules/src/rules/<bucket>/<rule-name>.ts`. You write a detector and a test; `bun run gen` discovers the file and wires it into the registry. You never edit the registry by hand.

There are three kinds of rule, distinguished only by which `define*` helper you call:

| Helper | Runs against | Use it for |
| --- | --- | --- |
| `defineAstRule` | A parsed tree-sitter tree of each `.move` file | Anything structural — abilities, fields, parameter lists, call shapes, nesting |
| `defineRule` | The raw lines of each `.move` file | Layout, comments, and import lines the parse tree can't express |
| `defineManifestRule` | The project's `Move.toml` | Manifest checks — edition, named addresses, dependencies |

Most rules should be AST rules. Reach for regex only when the thing you're checking is genuinely textual (comment style, blank-line layout, how imports are grouped). Reach for a manifest rule only for `Move.toml`.

## The bar a rule has to clear

Move Doctor's value is that its output is trustworthy. A noisy rule is worse than a missing one, because every false positive teaches the user (or their agent) to ignore the tool. Before you write a rule, make sure it is:

- **Single-purpose.** It catches one named problem. If you're tempted to detect "a few related things," that's a few rules.
- **Grounded in a source.** The problem must be defensible from [The Move Book code-quality checklist](https://move-book.com/guides/code-quality-checklist/), the Sui compiler's own `--lint` pass, or a documented Sui Move best practice. Set `citation` to that source. Opinions without a citation don't ship.
- **Precise.** The detector flags exactly what the message describes — no broader, no narrower.
- **Quiet on look-alikes.** A false positive is a correctness bug, not a tuning detail. Code that resembles the problem but isn't must pass clean.
- **Adversarially tested.** Your test includes the cases you'd expect a reviewer to throw at it — qualified types, postfix syntax, multi-line forms — not just the happy path.
- **Readable.** Helper names state their exact semantics (`isKeyOnlyUidStruct`, not `check2`). Someone auditing a false-positive report should be able to follow the logic without running it.

## Severity

Pick the lowest severity that's honest. The score model deducts per finding — `error` −8, `warning` −3, `info` −1, capped at −25 per rule — so severity directly controls how much a rule can move the score.

- `error` — a correctness or safety problem (e.g. sharing a capability, leaking `&mut UID`).
- `warning` — a real defect with low blast radius, or a strong convention the compiler also nudges on.
- `info` — style and naming. The default for most convention rules.

## Buckets

The bucket groups a rule in the report and in the catalog. The current buckets:

- `conventions/` — Move Book naming and style
- `functions/` — function-shape rules (parameter order, getters, entry/public split)
- `idioms/` — Move 2024 method syntax and standard-library idioms
- `macros/` — loop-macro replacements
- `testing/` — test-module-only style and attribute rules
- `abilities/` — struct ability mistakes
- `security/` — capability and access-control findings
- `gas/` — reserved; no rules yet

If a rule doesn't fit any of these, add a directory and add the name to the `RuleBucket` union in `packages/core/src/types.ts`. The codegen picks up the new directory automatically.

## Writing an AST rule

The engine parses each file once with [MystenLabs' tree-sitter Move grammar](https://github.com/MystenLabs/sui/tree/main/external-crates/move/tooling/tree-sitter) and hands the shared `tree` to every AST rule. You get a `tree` instead of raw text:

```ts
import type { Diagnostic } from "core";
import { collectNodesOfType, fieldText, nodePosition } from "../../utils/ast.js";
import { defineAstRule, makeDiagnostic } from "../../utils/define-rule.js";

export const myAstRule = defineAstRule({
  id: "conventions/my-ast-rule",   // must be "<bucket>/<file-name>"
  bucket: "conventions",
  severity: "info",
  citation: "Move Book §X",
  scanAst: ({ file, tree }) => {
    const diagnostics: Diagnostic[] = [];
    for (const node of collectNodesOfType(tree.rootNode, "struct_definition")) {
      const nameNode = node.childForFieldName("name");
      if (!nameNode) {
        continue;
      }
      // ...decide whether this node is a problem...
      diagnostics.push(
        makeDiagnostic({
          rule: myAstRule,
          filePath: file.filePath,
          ...nodePosition(nameNode),   // 1-based line/column of the offending node
          message: "What is wrong, in one sentence.",
          fixHint: "How to fix it, as one short imperative.",
        })
      );
    }
    return diagnostics;
  },
});
```

[`conventions/cap-struct-missing-suffix.ts`](../packages/rules/src/rules/conventions/cap-struct-missing-suffix.ts) is the reference implementation — it shows ability inspection, field walking, and qualified-type handling.

### AST helpers

Generic node-walking lives in [`src/utils/ast.ts`](../packages/rules/src/utils/ast.ts):

- `collectNodesOfType(root, type)` — depth-first collection of every named node of a type.
- `nodePosition(node)` — the node's 1-based `{ line, column }`, ready to spread into `makeDiagnostic`.
- `fieldText(node, fieldName)` — the text of a named field, or `null`.

Bucket-specific walkers live next to the rules that need them and are imported relatively, not from the package root:

- [`src/utils/fn-ast.ts`](../packages/rules/src/utils/fn-ast.ts) — `collectFunctions`, `functionParams`, `isPublic`, `isEntry`, `hasReturnType`, …
- [`src/utils/test-ast.ts`](../packages/rules/src/utils/test-ast.ts) — `isTestAnnotated`, `hasExpectedFailure`, `macroCallName`, `dotCallMethodName`, …

If you need a new walker, add a small focused helper rather than inlining tree traversal in the rule.

### Finding node and field names

The grammar's node and field names aren't documented anywhere convenient — discover them by dumping a tree:

```ts
import { getMoveParser } from "core";

const parser = await getMoveParser();
const tree = parser!.parse("module a::m { public struct S has key { id: UID } }");
console.log(tree!.rootNode.toString());
```

Common nodes you'll reach for: `struct_definition` (fields `name`, `struct_fields`, `ability_declarations` / `postfix_ability_declarations`), `function_definition` (`name`, `parameters`, `return_type`), `module_definition`, `call_expression`, `macro_call_expression`, `dot_expression`.

### The grammar wasm

The compiled grammar is committed at `packages/core/assets/tree-sitter-move.wasm`, so contributors and CI never need an Emscripten toolchain. To refresh it against newer Move syntax, bump `GRAMMAR_REF` in `scripts/build-move-grammar.ts`, run `bun run grammar:build`, and commit the result. If the grammar ever fails to load, AST rules are skipped and regex rules still run — an AST rule can't take the whole scan down with it.

## Writing a regex rule

For genuinely textual checks, `defineRule` gives you the `MoveFile` directly. Use `scanLines`, which iterates source lines with line- and block-comments already stripped:

```ts
import type { Diagnostic } from "core";
import { defineRule, makeDiagnostic } from "../../utils/define-rule.js";
import { scanLines } from "../../utils/line-scanner.js";

const USE_SELF_ONLY = /\buse\s+([A-Za-z_][\w:]*)::\{\s*Self\s*\}/g;

export const useSelfOnly = defineRule({
  id: "conventions/use-self-only",
  bucket: "conventions",
  severity: "info",
  citation: "Move Book §5",
  scan: (file) => {
    const diagnostics: Diagnostic[] = [];
    scanLines(file, USE_SELF_ONLY, (match) => {
      diagnostics.push(
        makeDiagnostic({
          rule: useSelfOnly,
          filePath: file.filePath,
          line: match.line,
          column: match.column,
          message: "`{Self}` is redundant when no other members are imported.",
          fixHint: `Replace with \`use ${match.groups[1]};\`.`,
        })
      );
    });
    return diagnostics;
  },
});
```

### Regex helpers

[`src/utils/line-scanner.ts`](../packages/rules/src/utils/line-scanner.ts):

- `scanLines(file, /pattern/g, onMatch)` — the workhorse; comment-stripped, gives each match a `{ line, column, text, groups }`.
- `forEachCodeLine(file, cb)` — same comment-stripping if you need raw line control.
- `findAllMatches(line, /pattern/g)` — all matches on a single string.
- `findMatchingBrace(source, offset)` / `findMatchingParen(source, offset)` — balanced delimiter matching that skips comments and string literals.
- `offsetToLineColumn(source, offset)` — translate a byte offset back to 1-based `{ line, column }`.

Note that `scanLines` strips comments but **not** strings — handle string-aware cases yourself.

## Writing a manifest rule

`defineManifestRule` runs once per project and receives the parsed `ProjectInfo` plus the raw `Move.toml` text:

```ts
import { defineManifestRule, makeDiagnostic } from "../../utils/define-rule.js";
import { lineNumberAtOffset } from "../../utils/manifest-scan.js";

const VALID_EDITIONS = new Set(["2024.beta", "2024", "2024.alpha"]);

export const missingEdition2024 = defineManifestRule({
  id: "conventions/missing-edition-2024",
  bucket: "conventions",
  severity: "warning",
  citation: "Move Book §1",
  scan: (project, manifestSource) => {
    if (project.edition && VALID_EDITIONS.has(project.edition)) {
      return [];
    }
    const header = manifestSource.match(/^\s*\[package\]/m);
    return [
      makeDiagnostic({
        rule: missingEdition2024,
        filePath: project.manifestPath,
        line: header ? lineNumberAtOffset(manifestSource, header.index!) : 1,
        message: `Package edition is "${project.edition ?? "unset"}". Set it to "2024.beta" to enable Move 2024 features.`,
        fixHint: 'Add `edition = "2024.beta"` to the [package] section of Move.toml.',
      }),
    ];
  },
});
```

[`src/utils/manifest-scan.ts`](../packages/rules/src/utils/manifest-scan.ts) gives you `extractSection(source, "dependencies")`, `scanManifest(source, /pattern/g, onMatch)`, and `lineNumberAtOffset(source, offset)`.

## The diagnostic

Every finding goes through `makeDiagnostic`, which stamps `source: "move-doctor"` and copies `severity`, `bucket`, and `citation` off the rule. You supply:

- `rule` — the rule object itself (pass the `export const` you're defining).
- `filePath` — `file.filePath` for file/AST rules, `project.manifestPath` for manifest rules.
- `line`, and optionally `column` (defaults to `1`). For AST rules, spread `...nodePosition(node)`.
- `message` — one sentence naming what's wrong. Name the offending symbol when you can; it makes the report scannable.
- `fixHint` — one short imperative telling the reader exactly what to do. This is what an agent acts on, so be concrete.

## Testing

Every rule needs a positive case, a look-alike case that must stay clean, and any edge case you found while testing against real code.

**AST rules** get a per-rule `<rule-name>.test.ts` that loads the real parser and feeds Move source. Mirror [`cap-struct-missing-suffix.test.ts`](../packages/rules/src/rules/conventions/cap-struct-missing-suffix.test.ts):

```ts
import { describe, expect, it } from "bun:test";
import { getMoveParser } from "core";
import { myAstRule } from "./my-ast-rule.js";

const parser = await getMoveParser();
if (!parser) {
  throw new Error("Move grammar wasm failed to load — run `bun run grammar:build`.");
}

const ruleIds = (src: string): string[] => {
  const wrapped = `module a::m { ${src} }`;
  const tree = parser.parse(wrapped);
  if (!tree) {
    throw new Error("parse returned null");
  }
  try {
    return myAstRule
      .scanAst({ file: { filePath: "/tmp/x.move", source: wrapped, lines: [wrapped] }, tree })
      .map((d) => d.ruleId);
  } finally {
    tree.delete();   // tree-sitter trees must be freed
  }
};

describe("conventions/my-ast-rule (AST)", () => {
  it("flags the problem", () => {
    expect(ruleIds("public struct Admin has key { id: UID }")).toHaveLength(1);
  });
  it("does NOT flag the look-alike", () => {
    expect(ruleIds("public struct AdminCap has key { id: UID }")).toEqual([]);
  });
});
```

**Regex and manifest rules** are exercised from the shared bucket test (`<bucket>.test.ts`) with a hand-built `MoveFile`:

```ts
const f = (source: string): MoveFile => ({
  filePath: "/tmp/x.move",
  source,
  lines: source.split(/\r?\n/),
});

expect(myRule.scan(f("use a::b::{Self};\n"))).toHaveLength(1); // bad
expect(myRule.scan(f("use a::b::{Self, C};\n"))).toEqual([]);   // look-alike, clean
```

## Documenting the rule

Each rule has a playbook at `docs/rules/<bucket>/<rule-name>.md`. The website serves these two ways: as the rule's catalog page at `/docs/rules/<bucket>/<rule>`, and as a plain-markdown endpoint at `/prompts/rules/<bucket>/<rule>.md` that agents fetch when fixing a finding. Add one when you add a rule — the slug must match the rule's id, and the heading should state the severity, bucket, and cited source.

## End-to-end workflow

```bash
# 1. Write the rule and its test.
# 2. Regenerate the registry (classifies by which define* you used).
bun run gen

# 3. Build and run the suite (unit + regression).
bun run build && bun run test

# 4. Smoke-test against a real project.
bun run cli <path-to-move-project> --verbose
```

`bun run gen` rewrites `packages/rules/src/rule-registry.ts`. That file is generated — never edit it by hand. A new `defineAstRule` lands in `astRules`, `defineManifestRule` in `manifestRules`, and `defineRule` in `fileRules`, all automatically.

## What's out of scope

tree-sitter gives you syntax, not semantics. These need a future analyzer tier (wrapping `sui-move-analyzer`) and shouldn't be faked with regex:

- Cross-module resolution — imports, package boundaries, where a symbol is defined.
- Type-aware analysis — knowing a receiver's type at a call site.
- Control-flow analysis — branch reachability, definite assignment.
- Bytecode-level checks.
- Auto-fix.

If a rule would need one of these, either approximate it conservatively (and document the gap in a comment) or leave it for the analyzer tier.
