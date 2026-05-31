import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
const CLI = path.join(REPO_ROOT, "packages", "move-doctor", "dist", "cli.js");

interface CliJson {
  compilerLintAvailable: boolean;
  diagnostics: { ruleId: string }[];
  package: string;
  score: {
    score: number;
    bySeverity: { error: number; warning: number; info: number };
  };
}

const scan = (fixture: string): CliJson => {
  const dir = path.join(REPO_ROOT, "fixtures", fixture);
  // The CLI exits 1 when error-severity findings exist (the CI gate), so we
  // read stdout directly rather than relying on a zero exit code.
  const { stdout, status } = spawnSync(
    "node",
    [CLI, dir, "--json", "--no-banner"],
    { encoding: "utf8" }
  );
  if (!stdout) {
    throw new Error(`CLI produced no stdout for ${fixture} (exit ${status})`);
  }
  return JSON.parse(stdout) as CliJson;
};

const ruleIds = (result: CliJson): Set<string> =>
  new Set(result.diagnostics.map((d) => d.ruleId));

// `compiler/*` findings come from the Sui CLI's `--lint` pass, which isn't
// present in CI — exclude them when locking move-doctor's own behavior so the
// baseline matches whether or not `sui` is installed.
const ownRuleIds = (result: CliJson): string[] =>
  result.diagnostics
    .map((d) => d.ruleId)
    .filter((id) => !id.startsWith("compiler/"));

describe("regression: hello-move (clean baseline)", () => {
  it("scores 100 with no findings", () => {
    const result = scan("hello-move");
    expect(result.score.score).toBe(100);
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe("regression: movebook-gaps (broad Move Book sampler)", () => {
  const result = scan("movebook-gaps");

  it("trips the expected number of move-doctor rules (locked)", () => {
    // A shift here flags a behavior change to review, not silently accept.
    const own = ownRuleIds(result);
    expect(own.length).toBeGreaterThanOrEqual(12);
    expect(own.length).toBeLessThanOrEqual(20);
  });

  it("surfaces the Move 2024 idiom rules it is designed to trip", () => {
    const ids = ruleIds(result);
    expect(ids.has("conventions/module-uses-brace-syntax")).toBe(true);
    expect(ids.has("conventions/ungrouped-package-imports")).toBe(true);
    expect(ids.has("idioms/vector-borrow-instead-of-index")).toBe(true);
    expect(ids.has("macros/manual-vector-destroy-loop")).toBe(true);
  });
});

describe("regression: conventions-bad (naming + layout conventions)", () => {
  const result = scan("conventions-bad");

  it("trips only convention rules and drops the score", () => {
    for (const id of ownRuleIds(result)) {
      expect(id.startsWith("conventions/")).toBe(true);
    }
    expect(result.score.score).toBeLessThan(100);
  });

  it("flags the missing edition and an unused const", () => {
    const ids = ruleIds(result);
    expect(ids.has("conventions/missing-edition-2024")).toBe(true);
    expect(ids.has("conventions/unused-const")).toBe(true);
  });
});

describe("regression: idioms-bad (Move 2024 idioms + functions)", () => {
  const result = scan("idioms-bad");

  it("trips the idiom, macro, and function rules it targets", () => {
    const ids = ruleIds(result);
    expect(ids.has("idioms/manual-option-unwrap")).toBe(true);
    expect(ids.has("idioms/module-fn-instead-of-method")).toBe(true);
    expect(ids.has("macros/manual-while-loop")).toBe(true);
    expect(ids.has("functions/transfer-in-composable")).toBe(true);
  });
});

describe("regression: security-bad (abilities + security vulnerabilities)", () => {
  const result = scan("security-bad");

  it("flags the two error-severity vulnerability rules", () => {
    const ids = ruleIds(result);
    expect(ids.has("abilities/copy-drop-on-asset")).toBe(true);
    expect(ids.has("security/public-share-of-cap")).toBe(true);
    expect(result.score.bySeverity.error).toBeGreaterThan(0);
  });
});

describe("regression: compiler-lints (Sui --lint integration)", () => {
  const result = scan("compiler-lints");

  it("trips its own finding, and a compiler lint when Sui is available", () => {
    expect(ruleIds(result).has("functions/transfer-in-composable")).toBe(true);
    if (result.compilerLintAvailable) {
      const hasCompilerLint = result.diagnostics.some((d) =>
        d.ruleId.startsWith("compiler/")
      );
      expect(hasCompilerLint).toBe(true);
    }
  });
});

interface WorkspaceCliJson {
  aggregateScore: {
    score: number;
    bySeverity: { error: number; warning: number; info: number };
  };
  perPackage: {
    relativePath: string;
    score: { score: number };
    diagnostics: { ruleId: string }[];
  }[];
  workspace: { packageCount: number; scanned: number };
}

const scanWorkspace = (fixture: string): WorkspaceCliJson => {
  const dir = path.join(REPO_ROOT, "fixtures", fixture);
  // Pin the workspace root: fixtures live inside this repo, so auto-detection
  // would resolve to the git root and pull in every sibling fixture.
  const { stdout, status } = spawnSync(
    "node",
    [CLI, dir, "--json", "--no-banner", `--workspace=${dir}`],
    { encoding: "utf8" }
  );
  if (!stdout) {
    throw new Error(`CLI produced no stdout for ${fixture} (exit ${status})`);
  }
  return JSON.parse(stdout) as WorkspaceCliJson;
};

describe("regression: workspace (multi-package monorepo)", () => {
  const result = scanWorkspace("workspace");
  const byPath = new Map(result.perPackage.map((p) => [p.relativePath, p]));

  it("scans every member package", () => {
    expect(result.workspace.scanned).toBe(3);
    expect(result.perPackage).toHaveLength(3);
  });

  it("aggregates the score worst-package-wins, summing errors", () => {
    const worst = Math.min(...result.perPackage.map((p) => p.score.score));
    expect(result.aggregateScore.score).toBe(worst);
    expect(result.aggregateScore.bySeverity.error).toBeGreaterThan(0);
  });

  it("keeps the clean member at 100 and flags the vault's shared cap", () => {
    expect(byPath.get("ledger")?.score.score).toBe(100);
    expect(byPath.get("ledger")?.diagnostics).toHaveLength(0);
    const vaultRules = new Set(
      byPath.get("vault")?.diagnostics.map((d) => d.ruleId) ?? []
    );
    expect(vaultRules.has("security/public-share-of-cap")).toBe(true);
  });
});
