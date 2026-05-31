import type { InspectResult, RuleBucket } from "core";
import { highlighter } from "core";
import { CMD, SUI_INSTALL_URL } from "./commands.js";
import { glyph } from "./glyphs.js";

export interface NextStepsContext {
  hasInstalledSkill: boolean;
  hasSuiCli: boolean;
  result: InspectResult;
}

interface NextStep {
  line: string;
}

const buildNextStep = (line: string): NextStep => ({ line });
const findHottestBucket = (result: InspectResult): RuleBucket | null => {
  const buckets = new Map<RuleBucket, number>();
  const severityWeight = (
    severity: InspectResult["diagnostics"][number]["severity"]
  ): number => {
    if (severity === "error") {
      return 8;
    }
    if (severity === "warning") {
      return 3;
    }
    return 1;
  };
  for (const diagnostic of result.diagnostics) {
    const weight = severityWeight(diagnostic.severity);
    buckets.set(
      diagnostic.bucket,
      (buckets.get(diagnostic.bucket) ?? 0) + weight
    );
  }
  let best: RuleBucket | null = null;
  let bestWeight = 0;
  for (const [bucket, weight] of buckets) {
    if (weight > bestWeight) {
      best = bucket;
      bestWeight = weight;
    }
  }
  return best;
};

export const buildNextSteps = (context: NextStepsContext): string[] => {
  const { result, hasInstalledSkill, hasSuiCli } = context;
  const lines: string[] = [];
  const steps: NextStep[] = [];

  if (result.diagnostics.length > 0) {
    steps.push(
      buildNextStep(
        `${highlighter.muted(glyph.pointer)} Run ${highlighter.accent("--verbose")} for file refs and fix hints.`
      )
    );
    const hottest = findHottestBucket(result);
    if (hottest) {
      steps.push(
        buildNextStep(
          `${highlighter.muted(glyph.pointer)} Focus on ${highlighter.bold(hottest)} first: ${highlighter.accent(CMD.verboseHere)}`
        )
      );
    }
  }

  if (!hasInstalledSkill) {
    steps.push(
      buildNextStep(
        `${highlighter.muted(glyph.pointer)} Install the agent skill so your agent can auto-fix findings: ${highlighter.accent(CMD.install)}`
      )
    );
  }

  if (!hasSuiCli) {
    steps.push(
      buildNextStep(
        `${highlighter.muted(glyph.pointer)} Install the Sui CLI to enable compiler lints (W0*): ${highlighter.accent(SUI_INSTALL_URL)}`
      )
    );
  }

  for (const step of steps) {
    lines.push(`  ${step.line}`);
  }
  return lines;
};
