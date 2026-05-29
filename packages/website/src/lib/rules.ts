import type { RuleBucket, Severity } from "core";
import { fileRules, manifestRules } from "rules";

export interface RuleEntry {
  bucket: RuleBucket;
  citation: string | null;
  citationUrl: string | null;
  id: string;
  kind: "file" | "manifest";
  severity: Severity;
  slug: string;
}

const toEntry =
  (kind: "file" | "manifest") =>
  (rule: {
    id: string;
    bucket: RuleBucket;
    severity: Severity;
    citation?: string;
    citationUrl?: string;
  }): RuleEntry => ({
    id: rule.id,
    slug: rule.id.split("/").slice(1).join("/"),
    bucket: rule.bucket,
    severity: rule.severity,
    citation: rule.citation ?? null,
    citationUrl: rule.citationUrl ?? null,
    kind,
  });

export const allRules: RuleEntry[] = [
  ...fileRules.map(toEntry("file")),
  ...manifestRules.map(toEntry("manifest")),
].sort((a, b) =>
  a.bucket === b.bucket
    ? a.id.localeCompare(b.id)
    : a.bucket.localeCompare(b.bucket)
);

export const bucketOrder: RuleBucket[] = [
  "conventions",
  "functions",
  "idioms",
  "macros",
  "testing",
  "abilities",
  "security",
  "gas",
];

export interface BucketSummary {
  bucket: RuleBucket;
  count: number;
  rules: RuleEntry[];
}

export const rulesByBucket: BucketSummary[] = bucketOrder
  .map((bucket) => ({
    bucket,
    count: allRules.filter((rule) => rule.bucket === bucket).length,
    rules: allRules.filter((rule) => rule.bucket === bucket),
  }))
  .filter((summary) => summary.count > 0);

export const findRule = (bucket: string, slug: string): RuleEntry | null =>
  allRules.find((rule) => rule.bucket === bucket && rule.slug === slug) ?? null;

export const BUCKET_BLURB: Record<RuleBucket, string> = {
  conventions:
    "Move Book §1–§12, §32, §40 — edition, naming, struct shape, doc style.",
  functions:
    "Move Book §13–§17 — `public entry`, transfer-in-composable, getter naming, parameter order.",
  idioms:
    "Move Book §18–§25 — module-fn-vs-method, vector access, Option macros.",
  macros:
    "Move Book §26–§31 — replace index-counter `while` loops with `do!` / `fold!` / `filter!`.",
  testing:
    "Move Book §33–§39 — attribute merging, naming, `assert!` style, scenario overuse.",
  abilities:
    "Ability safety — `copy, drop` on assets, missing `phantom` type parameters.",
  security:
    "Security best practices — public sharing of capabilities, plus Sui --lint pass-through.",
  gas: "Reserved for v0.2+ gas optimization rules.",
};
