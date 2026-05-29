import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { SKILL_MD_CONTENT } from "./skill-content.js";

export const installSkill = async (
  targetDirectory: string
): Promise<{ writtenPath: string }> => {
  const skillDirectory = path.join(
    targetDirectory,
    ".claude",
    "skills",
    "move-doctor"
  );
  await mkdir(skillDirectory, { recursive: true });
  const writtenPath = path.join(skillDirectory, "SKILL.md");
  await writeFile(writtenPath, SKILL_MD_CONTENT, "utf8");
  return { writtenPath };
};
