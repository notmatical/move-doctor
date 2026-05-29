import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
const CLI = path.join(REPO_ROOT, "packages", "move-doctor", "dist", "cli.js");

interface CliJson {
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
    {
      encoding: "utf8",
    }
  );
  if (!stdout) {
    throw new Error(`CLI produced no stdout for ${fixture} (exit ${status})`);
  }
  return JSON.parse(stdout) as CliJson;
};

const ruleIds = (result: CliJson): Set<string> =>
  new Set(result.diagnostics.map((d) => d.ruleId));

describe("regression: hello-move (clean fixture)", () => {
  it("scores 100 with no findings", () => {
    const result = scan("hello-move");
    expect(result.score.score).toBe(100);
    expect(result.diagnostics).toHaveLength(0);
  });
});

describe("regression: movebook-gaps (idiom-heavy fixture)", () => {
  const result = scan("movebook-gaps");

  it("scores in the expected band (locked)", () => {
    // Locked range — a rule change that moves this flags a behavior shift to
    // review, not silently accept.
    expect(result.score.score).toBeGreaterThanOrEqual(40);
    expect(result.score.score).toBeLessThanOrEqual(50);
  });

  it("surfaces the Move 2024 idiom rules it is designed to trip", () => {
    const ids = ruleIds(result);
    expect(ids.has("conventions/module-uses-brace-syntax")).toBe(true);
    expect(ids.has("conventions/ungrouped-package-imports")).toBe(true);
    expect(ids.has("idioms/vector-borrow-instead-of-index")).toBe(true);
    expect(ids.has("macros/manual-vector-destroy-loop")).toBe(true);
  });
});

describe("regression: phase5-bad (abilities + security fixture)", () => {
  const result = scan("phase5-bad");

  it("flags the two error-severity vulnerability rules", () => {
    const ids = ruleIds(result);
    expect(ids.has("abilities/copy-drop-on-asset")).toBe(true);
    expect(ids.has("security/public-share-of-cap")).toBe(true);
    expect(result.score.bySeverity.error).toBeGreaterThan(0);
  });
});
