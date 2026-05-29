import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

interface ProjectEntry {
  rootDirectory: string;
  setupPrompt?: false;
}

interface ConfigShape {
  projects?: Record<string, ProjectEntry>;
}

const configFilePath = (): string =>
  path.join(os.homedir(), ".move-doctor", "config.json");

const projectKey = (projectRoot: string): string =>
  createHash("sha256")
    .update(path.resolve(projectRoot))
    .digest("hex")
    .slice(0, 16);

const readConfig = async (): Promise<ConfigShape> => {
  const filePath = configFilePath();
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const source = await readFile(filePath, "utf8");
    return JSON.parse(source) as ConfigShape;
  } catch {
    return {};
  }
};

const writeConfig = async (config: ConfigShape): Promise<void> => {
  const filePath = configFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
};

export const hasDisabledSetupPrompt = async (
  projectRoot: string
): Promise<boolean> => {
  const config = await readConfig();
  return config.projects?.[projectKey(projectRoot)]?.setupPrompt === false;
};

export const disableSetupPrompt = async (
  projectRoot: string
): Promise<void> => {
  const config = await readConfig();
  const projects = config.projects ?? {};
  projects[projectKey(projectRoot)] = {
    rootDirectory: path.resolve(projectRoot),
    setupPrompt: false,
  };
  await writeConfig({ ...config, projects });
};
