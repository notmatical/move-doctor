import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { mapEntryToDiagnostic, parseSuiLintOutput } from "./sui-cli.js";

const REAL_OUTPUT = `INCLUDING DEPENDENCY MoveStdlib
INCLUDING DEPENDENCY Sui
BUILDING lint_trigger
[
  {
    "file": ".\\\\sources\\\\bad.move",
    "line": 9,
    "column": 4,
    "level": "Warning",
    "category": 99,
    "code": 1,
    "msg": "non-composable transfer to sender"
  }
]
Please report feedback on the linter warnings at https://forums.sui.io`;

describe("parseSuiLintOutput", () => {
  it("extracts a single entry and maps it to a Diagnostic", () => {
    const rootDirectory = "/tmp/project";
    const diagnostics = parseSuiLintOutput(REAL_OUTPUT, rootDirectory);
    expect(diagnostics).toHaveLength(1);
    const diagnostic = diagnostics[0]!;
    expect(diagnostic.ruleId).toBe("compiler/w99001");
    expect(diagnostic.severity).toBe("warning");
    expect(diagnostic.source).toBe("compiler");
    expect(diagnostic.line).toBe(9);
    expect(diagnostic.column).toBe(4);
    expect(diagnostic.message).toBe("non-composable transfer to sender");
    expect(diagnostic.filePath).toBe(
      path.resolve(rootDirectory, "sources/bad.move")
    );
  });

  it("returns [] when no JSON array is present", () => {
    expect(parseSuiLintOutput("BUILDING foo\n", "/tmp")).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    expect(parseSuiLintOutput("[ this is not json", "/tmp")).toEqual([]);
  });
});

describe("mapEntryToDiagnostic", () => {
  it("formats compound (category, code) into compiler/w<XX><YYY>", () => {
    const diagnostic = mapEntryToDiagnostic(
      {
        file: "sources/x.move",
        line: 1,
        column: 1,
        level: "Warning",
        category: 1,
        code: 1,
        msg: "self transfer",
      },
      "/tmp"
    );
    expect(diagnostic.ruleId).toBe("compiler/w01001");
  });

  it("maps Error level to error severity", () => {
    const diagnostic = mapEntryToDiagnostic(
      {
        file: "sources/x.move",
        line: 1,
        column: 1,
        level: "Error",
        category: 1,
        code: 1,
        msg: "oops",
      },
      "/tmp"
    );
    expect(diagnostic.severity).toBe("error");
  });
});
