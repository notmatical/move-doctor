import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { repoPath } from "./repo-path";
import type { RuleEntry } from "./rules";

export interface RulePlaybook {
  markdown: string | null;
  rule: RuleEntry;
}

const playbookPath = (rule: RuleEntry): string =>
  repoPath("docs", "rules", rule.bucket, `${rule.slug}.md`);

export const loadPlaybook = async (rule: RuleEntry): Promise<RulePlaybook> => {
  const filePath = playbookPath(rule);
  if (!existsSync(filePath)) {
    return { rule, markdown: null };
  }
  const markdown = await readFile(filePath, "utf8");
  return { rule, markdown };
};
