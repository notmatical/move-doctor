import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { intro, log, outro, spinner } from "@clack/prompts";
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

// Headline shown on the install spinner's stop line; extras (canonical source
// path, per-agent failures) follow as muted/warn log entries.
const skillSummaryHeadline = (summary: SkillInstallSummary): string => {
  if (summary.installed.length === 0) {
    return "No agents detected — skill not installed";
  }
  const agents = summary.installed.map((entry) => entry.agent).join(", ");
  const count = `${summary.installed.length} agent${summary.installed.length === 1 ? "" : "s"}`;
  return `Skill installed for ${highlighter.bold(count)}  ${highlighter.muted(`(${agents})`)}`;
};

const emitSkillExtras = (
  summary: SkillInstallSummary,
  projectRoot: string
): void => {
  const canonical = summary.installed.find((entry) => entry.mode === "symlink");
  if (canonical) {
    log.message(
      highlighter.muted(
        `source: ${path.relative(projectRoot, canonical.path) || canonical.path}`
      )
    );
  }
  for (const failure of summary.failed) {
    log.warn(`${failure.agent}: ${highlighter.muted(failure.error)}`);
  }
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
  const detectionSpinner = spinner();
  detectionSpinner.start("Detecting installed agents…");
  const detected = await detectAgentsWithFallback();
  detectionSpinner.stop(
    `Detected ${detected.length} agent${detected.length === 1 ? "" : "s"}: ${highlighter.muted(detected.join(", "))}`
  );
  const agents = pick ? await pickAgentsInteractively(detected) : detected;
  if (agents.length !== detected.length) {
    log.message(
      highlighter.muted(
        `Selected ${agents.length} of ${detected.length}: ${agents.join(", ")}`
      )
    );
  }
  return agents;
};

const applyTargets = async (
  projectRoot: string,
  targets: ApplyTargets
): Promise<void> => {
  if (targets.skill) {
    const installSpinner = spinner();
    installSpinner.start(
      `Installing skill to ${targets.agents.length} agent${targets.agents.length === 1 ? "" : "s"}…`
    );
    const summary = await installSkillForAgents(projectRoot, targets.agents);
    installSpinner.stop(skillSummaryHeadline(summary));
    emitSkillExtras(summary, projectRoot);
  }
  if (targets.workflow) {
    const { path: workflowPath, existed } = await installWorkflow(projectRoot);
    const rel = path.relative(projectRoot, workflowPath);
    if (existed) {
      log.message(
        highlighter.muted(`Workflow already exists at ${rel}, left untouched.`)
      );
    } else {
      log.success(`GitHub workflow installed at ${highlighter.muted(rel)}`);
    }
  }
  if (targets.agentHooks) {
    const hookSpinner = spinner();
    hookSpinner.start("Installing agent hooks…");
    const result = installMoveDoctorAgentHooks({
      projectRoot,
      agents: targets.agents,
    });
    if (result.installedAgents.length === 0) {
      hookSpinner.stop(
        highlighter.muted(
          "No Claude Code / Cursor agents — hooks not installed"
        )
      );
    } else {
      const names = result.installedAgents
        .map((agent) => getSkillAgentConfig(agent).displayName)
        .join(", ");
      hookSpinner.stop(`Agent hooks installed for ${highlighter.bold(names)}`);
    }
  }
};

const printNoninteractiveHint = (projectRoot: string): void => {
  process.stdout.write(
    `\n  ${highlighter.muted("›")} Run ${highlighter.accent("npx move-doctor install --yes")} in ${highlighter.muted(projectRoot)} to install the skill + CI workflow.\n`
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
    intro(`✚ ${highlighter.bold("move-doctor setup")}`);
    const agents = await resolveAgents(false);
    await applyTargets(projectRoot, {
      agents,
      skill: true,
      workflow: true,
      agentHooks: false,
    });
    outro("Skill + CI workflow installed.");
    return;
  }

  if (await hasDisabledSetupPrompt(projectRoot)) {
    printNoninteractiveHint(projectRoot);
    return;
  }

  intro(`✚ ${highlighter.bold("move-doctor setup")}`);

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
    outro(
      `Skipped. Run ${highlighter.accent("npx move-doctor install")} anytime.`
    );
    return;
  }
  if (choice === "never") {
    await disableSetupPrompt(projectRoot);
    outro(
      `Got it. Run ${highlighter.accent("npx move-doctor install")} when you change your mind.`
    );
    return;
  }

  // 2. which agents to install the skill for.
  const agents = await resolveAgents(true);
  if (agents.length === 0) {
    outro("No agents selected — nothing installed.");
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
  outro(
    `Done. Run ${highlighter.accent("npx move-doctor .")} again to see the agent in action.`
  );
};
