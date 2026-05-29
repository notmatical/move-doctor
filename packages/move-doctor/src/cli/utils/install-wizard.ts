import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  detectInstalledSkillAgents,
  getSkillAgentConfig,
  installSkillsFromSource,
  type SkillAgentType,
} from "agent-install";
import { highlighter } from "core";
import { SKILL_MD_CONTENT } from "../skill-content.js";
import {
  canInstallNativeAgentHooks,
  installMoveDoctorAgentHooks,
} from "./install-agent-hooks.js";
import { isInteractive } from "./is-ci.js";
import {
  disableSetupPrompt,
  hasDisabledSetupPrompt,
} from "./persistent-config.js";
import { type MultiSelectChoice, multiselect, select } from "./prompts.js";
import { startSpinner } from "./spinner.js";

const POINTER =
  process.platform === "win32" && !process.env.WT_SESSION ? ">" : "›";
const SKILL_NAME = "move-doctor";
const FALLBACK_AGENT: SkillAgentType = "claude-code";

const GITHUB_ACTION_WORKFLOW = `name: move-doctor

on:
  push:
    branches: [main]
  pull_request:

jobs:
  doctor:
    name: Score Move codebase
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Score the codebase
        run: |
          SCORE=$(npx --yes move-doctor@latest . --score)
          echo "move-doctor score: $SCORE"
          if [ "$SCORE" -lt 80 ]; then
            echo "::warning::move-doctor score below 80 threshold"
          fi
`;

type SetupChoice = "yes" | "skip" | "never";
type SetupOption = "skip" | "agent-hooks" | "workflow";

export interface InstallWizardOptions {
  /**
   * Where the skill + workflow get written. For workspaces this should be the
   * git root (or workspace marker); for single-package projects it's the same
   * as the Move package root.
   */
  projectRoot: string;
  /** Optional human-readable display name shown in the wizard summary. */
  rootDisplayName?: string;
  yes?: boolean;
}

const writeEmbeddedSkillToTempDir = async (): Promise<{
  sourceDirectory: string;
  cleanup: () => Promise<void>;
}> => {
  const tempBase = await mkdtemp(path.join(os.tmpdir(), "move-doctor-skill-"));
  const skillDirectory = path.join(tempBase, SKILL_NAME);
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(
    path.join(skillDirectory, "SKILL.md"),
    SKILL_MD_CONTENT,
    "utf8"
  );
  return {
    sourceDirectory: skillDirectory,
    cleanup: async () => {
      try {
        await rm(tempBase, { recursive: true, force: true });
      } catch {}
    },
  };
};

interface SkillInstallSummary {
  failed: { agent: SkillAgentType; error: string }[];
  installed: {
    agent: SkillAgentType;
    path: string;
    mode: "symlink" | "copy";
  }[];
}

const installSkillForAgents = async (
  projectRoot: string,
  agents: SkillAgentType[]
): Promise<SkillInstallSummary> => {
  const { sourceDirectory, cleanup } = await writeEmbeddedSkillToTempDir();
  try {
    const result = await installSkillsFromSource({
      source: sourceDirectory,
      agents,
      cwd: projectRoot,
      mode: "symlink",
    });
    return {
      installed: result.installed.map((entry) => ({
        agent: entry.agent,
        path: entry.path,
        mode: entry.mode,
      })),
      failed: result.failed.map((entry) => ({
        agent: entry.agent,
        error: entry.error,
      })),
    };
  } finally {
    await cleanup();
  }
};

const installWorkflow = async (
  projectRoot: string
): Promise<{ path: string; existed: boolean }> => {
  const workflowDirectory = path.join(projectRoot, ".github", "workflows");
  await mkdir(workflowDirectory, { recursive: true });
  const targetPath = path.join(workflowDirectory, "move-doctor.yml");
  const existed = existsSync(targetPath);
  if (!existed) {
    await writeFile(targetPath, GITHUB_ACTION_WORKFLOW, "utf8");
  }
  return { path: targetPath, existed };
};

const formatSkillSummary = (
  summary: SkillInstallSummary,
  projectRoot: string
): string => {
  if (summary.installed.length === 0 && summary.failed.length === 0) {
    return `  ${highlighter.muted("·")} No agents detected on this machine — skill not installed anywhere.`;
  }
  const lines: string[] = [];
  if (summary.installed.length > 0) {
    const agents = summary.installed.map((entry) => entry.agent).join(", ");
    lines.push(
      `  ${highlighter.ok("✓")} Skill installed for ${highlighter.bold(`${summary.installed.length} agent${summary.installed.length === 1 ? "" : "s"}`)}  ${highlighter.muted(`(${agents})`)}`
    );
    const canonical = summary.installed.find(
      (entry) => entry.mode === "symlink"
    );
    if (canonical) {
      lines.push(
        `       ${highlighter.muted(`source: ${path.relative(projectRoot, canonical.path) || canonical.path}`)}`
      );
    }
  }
  for (const failure of summary.failed) {
    lines.push(
      `  ${highlighter.warn("⚠")} ${failure.agent}: ${highlighter.muted(failure.error)}`
    );
  }
  return lines.join("\n");
};

const detectAgentsWithFallback = async (): Promise<SkillAgentType[]> => {
  try {
    const detected = await detectInstalledSkillAgents();
    if (detected.length === 0) {
      return [FALLBACK_AGENT];
    }
    return detected;
  } catch {
    return [FALLBACK_AGENT];
  }
};

interface ApplyTargets {
  agentHooks: boolean;
  // Resolved agent list the skill + agent hooks install for.
  agents: SkillAgentType[];
  skill: boolean;
  workflow: boolean;
}

const pickAgentsInteractively = async (
  detected: SkillAgentType[]
): Promise<SkillAgentType[]> => {
  if (!isInteractive()) {
    return detected;
  }
  const selection = await multiselect<SkillAgentType>({
    message: `Install the ${highlighter.accent(`/${SKILL_NAME}`)} skill for:`,
    choices: detected.map((agent) => ({
      title: getSkillAgentConfig(agent).displayName,
      value: agent,
      selected: true,
    })),
    min: 1,
  });
  if (selection === null || selection.length === 0) {
    return detected;
  }
  return selection;
};

// detect installed agents (with fallback) and, when `pick` is set, let the user
// narrow the list. Surfaces the detected count + any narrowing.
const resolveAgents = async (pick: boolean): Promise<SkillAgentType[]> => {
  const detectionSpinner = startSpinner("Detecting installed agents…");
  const detected = await detectAgentsWithFallback();
  detectionSpinner.succeed(
    `Detected ${detected.length} agent${detected.length === 1 ? "" : "s"}: ${highlighter.muted(detected.join(", "))}`
  );
  const agents = pick ? await pickAgentsInteractively(detected) : detected;
  if (agents.length !== detected.length) {
    process.stdout.write(
      `  ${highlighter.muted("·")} Selected ${highlighter.bold(`${agents.length}`)} of ${detected.length}: ${highlighter.muted(agents.join(", "))}\n`
    );
  }
  return agents;
};

const applyTargets = async (
  projectRoot: string,
  targets: ApplyTargets
): Promise<void> => {
  if (targets.skill) {
    const installSpinner = startSpinner(
      `Installing skill to ${targets.agents.length} agent${targets.agents.length === 1 ? "" : "s"}…`
    );
    const summary = await installSkillForAgents(projectRoot, targets.agents);
    installSpinner.stop();
    process.stdout.write(`${formatSkillSummary(summary, projectRoot)}\n`);
  }
  if (targets.workflow) {
    const { path: workflowPath, existed } = await installWorkflow(projectRoot);
    if (existed) {
      process.stdout.write(
        `  ${highlighter.muted("·")} Workflow already exists at ${highlighter.muted(path.relative(projectRoot, workflowPath))}, left untouched.\n`
      );
    } else {
      process.stdout.write(
        `  ${highlighter.ok("✓")} GitHub workflow installed at ${highlighter.muted(path.relative(projectRoot, workflowPath))}\n`
      );
    }
  }
  if (targets.agentHooks) {
    const hookSpinner = startSpinner("Installing agent hooks…");
    const result = installMoveDoctorAgentHooks({
      projectRoot,
      agents: targets.agents,
    });
    hookSpinner.stop();
    if (result.installedAgents.length === 0) {
      process.stdout.write(
        `  ${highlighter.muted("·")} No Claude Code / Cursor agents selected — agent hooks not installed.\n`
      );
    } else {
      const names = result.installedAgents
        .map((agent) => getSkillAgentConfig(agent).displayName)
        .join(", ");
      process.stdout.write(
        `  ${highlighter.ok("✓")} Agent hooks installed for ${highlighter.bold(names)}\n`
      );
    }
  }
};

const printNoninteractiveHint = (projectRoot: string): void => {
  process.stdout.write(
    `\n  ${highlighter.muted(POINTER)} Run ${highlighter.accent("npx move-doctor install --yes")} in ${highlighter.muted(projectRoot)} to install the skill + CI workflow.\n`
  );
};

export const isWorkflowInstalled = (projectRoot: string): boolean =>
  existsSync(path.join(projectRoot, ".github", "workflows", "move-doctor.yml"));

const buildSetupChoices = (
  projectRoot: string,
  agents: SkillAgentType[]
): MultiSelectChoice<SetupOption>[] => {
  const choices: MultiSelectChoice<SetupOption>[] = [
    {
      title: "Skip optional setup",
      description: "Install only the agent skill",
      value: "skip",
      selected: false,
    },
  ];
  if (canInstallNativeAgentHooks(agents)) {
    choices.push({
      title: "Agent hooks",
      description: "Ask Claude Code or Cursor to scan after code edits",
      value: "agent-hooks",
      selected: true,
    });
  }
  if (!isWorkflowInstalled(projectRoot)) {
    choices.push({
      title: "GitHub Actions workflow",
      description: "Score the codebase in CI",
      value: "workflow",
      selected: true,
    });
  }
  return choices;
};

export const runInstallWizard = async (
  options: InstallWizardOptions
): Promise<void> => {
  const { projectRoot, yes = false } = options;

  if (yes || !isInteractive()) {
    // non-interactive runs install the skill + workflow for every detected agent.
    const agents = await resolveAgents(false);
    await applyTargets(projectRoot, {
      agents,
      skill: true,
      workflow: true,
      agentHooks: false,
    });
    return;
  }

  if (await hasDisabledSetupPrompt(projectRoot)) {
    printNoninteractiveHint(projectRoot);
    return;
  }

  // 1. build choices
  const choice = await select<SetupChoice>({
    message: "Set up move-doctor for this project?",
    choices: [
      {
        title: "Yes (recommended)",
        description: "Install the agent skill, then pick optional setup",
        value: "yes",
      },
      {
        title: "Skip for now",
        description: "Ask me again next time",
        value: "skip",
      },
      {
        title: "Never (don't ask again)",
        description: "Persisted to ~/.move-doctor/config.json",
        value: "never",
      },
    ],
    initial: 0,
  });

  if (choice === null || choice === "skip") {
    return;
  }
  if (choice === "never") {
    await disableSetupPrompt(projectRoot);
    process.stdout.write(
      `\n  ${highlighter.muted(POINTER)} Got it. Run ${highlighter.accent("npx move-doctor install")} when you change your mind.\n`
    );
    return;
  }

  process.stdout.write("\n");

  // 2. which agents to install the skill for.
  const agents = await resolveAgents(true);
  if (agents.length === 0) {
    return;
  }

  // 3. additional setup
  const setupChoices = buildSetupChoices(projectRoot, agents);
  let selectedSetup: SetupOption[] = [];
  if (setupChoices.length > 1) {
    selectedSetup =
      (await multiselect<SetupOption>({
        message: "Select additional move-doctor setup:",
        choices: setupChoices,
        min: 0,
      })) ?? [];
  }

  const didSkipOptional = selectedSetup.includes("skip");
  const actions = selectedSetup.filter((option) => option !== "skip");

  await applyTargets(projectRoot, {
    agents,
    skill: true,
    workflow: !didSkipOptional && actions.includes("workflow"),
    agentHooks: !didSkipOptional && actions.includes("agent-hooks"),
  });
  process.stdout.write(
    `\n  ${highlighter.muted(POINTER)} Done. Run ${highlighter.accent("npx move-doctor .")} again to see the agent in action.\n`
  );
};
