import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import type { SkillAgentType } from "agent-install";

const AGENT_HOOK_TIMEOUT_SECONDS = 120;
const EXECUTABLE_MODE = 0o755;
const JSON_INDENT_SPACES = 2;

const CLAUDE_AGENT: SkillAgentType = "claude-code";
const CURSOR_AGENT: SkillAgentType = "cursor";

const CLAUDE_SETTINGS_RELATIVE_PATH = ".claude/settings.json";
const CLAUDE_HOOK_RELATIVE_PATH = ".claude/hooks/move-doctor.sh";
const CLAUDE_HOOK_COMMAND =
  'sh "$CLAUDE_PROJECT_DIR/.claude/hooks/move-doctor.sh"';
const CURSOR_HOOKS_RELATIVE_PATH = ".cursor/hooks.json";
const CURSOR_HOOK_RELATIVE_PATH = ".cursor/hooks/move-doctor.sh";
const CURSOR_HOOK_MATCHER = "Write|Edit|MultiEdit|ApplyPatch";
const CURSOR_HOOKS_SCHEMA_VERSION = 1;

interface InstallAgentHooksOptions {
  readonly agents: readonly SkillAgentType[];
  readonly projectRoot: string;
}

interface InstallAgentHooksResult {
  readonly files: readonly string[];
  readonly installedAgents: readonly SkillAgentType[];
}

interface ClaudeHookHandler {
  readonly command: string;
  readonly type: "command";
}

interface ClaudeHookGroup {
  readonly hooks?: readonly ClaudeHookHandler[];
  readonly matcher?: string;
}

interface ClaudeSettings {
  readonly hooks?: Record<string, readonly ClaudeHookGroup[]>;
  readonly [key: string]: unknown;
}

interface CursorHookHandler {
  readonly command: string;
  readonly matcher?: string;
  readonly timeout?: number;
}

interface CursorHooksConfig {
  readonly hooks?: Record<string, readonly CursorHookHandler[]>;
  readonly version?: number;
  readonly [key: string]: unknown;
}

export const canInstallNativeAgentHooks = (
  agents: readonly SkillAgentType[]
): boolean =>
  agents.some((agent) => agent === CLAUDE_AGENT || agent === CURSOR_AGENT);

const isSupportedAgent = (agent: SkillAgentType): boolean =>
  agent === CLAUDE_AGENT || agent === CURSOR_AGENT;

const readJsonFile = <Value>(filePath: string, fallback: Value): Value => {
  if (!existsSync(filePath)) {
    return fallback;
  }
  const content = readFileSync(filePath, "utf8").trim();
  if (content.length === 0) {
    return fallback;
  }
  return JSON.parse(content) as Value;
};

const writeJsonFile = (filePath: string, value: unknown): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${JSON.stringify(value, null, JSON_INDENT_SPACES)}\n`
  );
};

// `#!/bin/sh` POSIX script. On a PostToolBatch/postToolUse event it scans the
// working tree with move-doctor (changed files only) and, when the scan exits
// non-zero, feeds the output back to the agent as additionalContext so it fixes
// the regressions before finishing.
//
// move-doctor exits non-zero only on error-severity findings today. Surfacing
// warning-level findings needs a `--fail-on warning` flag, which ships with the
// deferred pre-commit work.
const buildAgentHookScript = (): string =>
  [
    "#!/bin/sh",
    "set -u",
    "",
    'input_file=$(mktemp "${TMPDIR:-/tmp}/move-doctor-agent-hook.XXXXXX")',
    'output_file=$(mktemp "${TMPDIR:-/tmp}/move-doctor-agent-hook-output.XXXXXX")',
    'trap \'rm -f "$input_file" "$output_file"\' EXIT',
    'cat > "$input_file"',
    "",
    'script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)',
    "project_root=${CLAUDE_PROJECT_DIR:-}",
    'if [ -z "$project_root" ]; then',
    '  project_root=$(CDPATH= cd "$script_dir/../.." && pwd)',
    "fi",
    'if ! cd "$project_root"; then',
    "  exit 0",
    "fi",
    "",
    "should_scan() {",
    "  if ! command -v node >/dev/null 2>&1; then",
    "    return 0",
    "  fi",
    "",
    "  node - \"$input_file\" <<'NODE'",
    "const fs = require('node:fs');",
    "const inputPath = process.argv[2];",
    "const editToolNames = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'ApplyPatch']);",
    "try {",
    "  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8') || '{}');",
    "  const eventName = input.hook_event_name || input.eventName || input.event_name;",
    "  if (eventName === 'PostToolBatch') {",
    "    const toolCalls = Array.isArray(input.tool_calls) ? input.tool_calls : [];",
    "    process.exit(toolCalls.some((toolCall) => editToolNames.has(toolCall.tool_name)) ? 0 : 10);",
    "  }",
    "  const toolName = input.tool_name || input.toolName || input.tool;",
    "  process.exit(!toolName || editToolNames.has(toolName) ? 0 : 10);",
    "} catch {",
    "  process.exit(0);",
    "}",
    "NODE",
    "}",
    "",
    "run_move_doctor() {",
    "  if [ -x ./node_modules/.bin/move-doctor ]; then",
    "    ./node_modules/.bin/move-doctor . --diff --verbose --no-banner --skip-setup",
    "    return",
    "  fi",
    "",
    "  if command -v move-doctor >/dev/null 2>&1; then",
    "    move-doctor . --diff --verbose --no-banner --skip-setup",
    "    return",
    "  fi",
    "",
    "  if command -v pnpm >/dev/null 2>&1; then",
    "    pnpm dlx move-doctor@latest . --diff --verbose --no-banner --skip-setup",
    "    return",
    "  fi",
    "",
    "  if command -v npx >/dev/null 2>&1; then",
    "    npx --yes move-doctor@latest . --diff --verbose --no-banner --skip-setup",
    "    return",
    "  fi",
    "",
    "  printf '%s\\n' 'move-doctor: command not found; skipping agent hook scan.'",
    "  return 0",
    "}",
    "",
    "if ! should_scan; then",
    "  exit 0",
    "fi",
    "",
    'if run_move_doctor > "$output_file" 2>&1; then',
    "  exit 0",
    "fi",
    "",
    'node - "$input_file" "$output_file" <<\'NODE\'',
    "const fs = require('node:fs');",
    "const inputPath = process.argv[2];",
    "const outputPath = process.argv[3];",
    "const readInput = () => {",
    "  try {",
    "    return JSON.parse(fs.readFileSync(inputPath, 'utf8') || '{}');",
    "  } catch {",
    "    return {};",
    "  }",
    "};",
    "const input = readInput();",
    "const scanOutput = fs.readFileSync(outputPath, 'utf8').trim();",
    "if (!scanOutput) process.exit(0);",
    "const message = `move-doctor found issues in the changed Move files. Review this output and fix the regressions before finishing.\\n\\n${scanOutput}`;",
    "if (input.hook_event_name === 'PostToolBatch') {",
    "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolBatch', additionalContext: message } }));",
    "} else {",
    "  console.log(JSON.stringify({ additional_context: message }));",
    "}",
    "NODE",
    "",
  ].join("\n");

const writeHookScript = (filePath: string): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, buildAgentHookScript());
  chmodSync(filePath, EXECUTABLE_MODE);
};

const hasClaudeHookCommand = (groups: readonly ClaudeHookGroup[]): boolean =>
  groups.some((group) =>
    (group.hooks ?? []).some((hook) => hook.command === CLAUDE_HOOK_COMMAND)
  );

const installClaudeHook = (projectRoot: string): readonly string[] => {
  const settingsPath = path.join(projectRoot, CLAUDE_SETTINGS_RELATIVE_PATH);
  const hookPath = path.join(projectRoot, CLAUDE_HOOK_RELATIVE_PATH);
  const settings = readJsonFile<ClaudeSettings>(settingsPath, {});
  const hooks = { ...(settings.hooks ?? {}) };
  const postToolBatchHooks = [...(hooks.PostToolBatch ?? [])];

  if (!hasClaudeHookCommand(postToolBatchHooks)) {
    postToolBatchHooks.push({
      hooks: [{ type: "command", command: CLAUDE_HOOK_COMMAND }],
    });
  }

  hooks.PostToolBatch = postToolBatchHooks;
  writeJsonFile(settingsPath, { ...settings, hooks });
  writeHookScript(hookPath);

  return [settingsPath, hookPath];
};

const hasCursorHookCommand = (
  handlers: readonly CursorHookHandler[]
): boolean =>
  handlers.some((handler) => handler.command === CURSOR_HOOK_RELATIVE_PATH);

const installCursorHook = (projectRoot: string): readonly string[] => {
  const configPath = path.join(projectRoot, CURSOR_HOOKS_RELATIVE_PATH);
  const hookPath = path.join(projectRoot, CURSOR_HOOK_RELATIVE_PATH);
  const config = readJsonFile<CursorHooksConfig>(configPath, {});
  const hooks = { ...(config.hooks ?? {}) };
  const postToolUseHooks = [...(hooks.postToolUse ?? [])];

  if (!hasCursorHookCommand(postToolUseHooks)) {
    postToolUseHooks.push({
      command: CURSOR_HOOK_RELATIVE_PATH,
      matcher: CURSOR_HOOK_MATCHER,
      timeout: AGENT_HOOK_TIMEOUT_SECONDS,
    });
  }

  hooks.postToolUse = postToolUseHooks;
  writeJsonFile(configPath, {
    ...config,
    version: config.version ?? CURSOR_HOOKS_SCHEMA_VERSION,
    hooks,
  });
  writeHookScript(hookPath);

  return [configPath, hookPath];
};

export const isAgentHooksInstalled = (projectRoot: string): boolean =>
  existsSync(path.join(projectRoot, CLAUDE_HOOK_RELATIVE_PATH)) ||
  existsSync(path.join(projectRoot, CURSOR_HOOK_RELATIVE_PATH));

export const installMoveDoctorAgentHooks = (
  options: InstallAgentHooksOptions
): InstallAgentHooksResult => {
  const installedAgents: SkillAgentType[] = [];
  const files: string[] = [];

  for (const agent of options.agents.filter(isSupportedAgent)) {
    if (agent === CLAUDE_AGENT) {
      files.push(...installClaudeHook(options.projectRoot));
      installedAgents.push(agent);
    }
    if (agent === CURSOR_AGENT) {
      files.push(...installCursorHook(options.projectRoot));
      installedAgents.push(agent);
    }
  }

  return { installedAgents, files };
};
