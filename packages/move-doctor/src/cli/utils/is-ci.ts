const CI_ENV_VARS = [
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "CIRCLECI",
  "BUILDKITE",
] as const;

const CODING_AGENT_ENV_VARS = [
  "CLAUDECODE",
  "CLAUDE_CODE",
  "CURSOR_AGENT",
  "CODEX_CI",
  "CODEX_SANDBOX",
  "CODEX_SANDBOX_NETWORK_DISABLED",
  "OPENCODE",
  "GOOSE_TERMINAL",
  "AGENT_SESSION_ID",
] as const;

export const isCiEnvironment = (): boolean =>
  CI_ENV_VARS.some((variable) => Boolean(process.env[variable])) ||
  process.env.CI === "true";

export const isCodingAgentEnvironment = (): boolean =>
  CODING_AGENT_ENV_VARS.some((variable) => Boolean(process.env[variable])) ||
  ["amp", "goose"].includes((process.env.AGENT ?? "").toLowerCase());

export const isInteractive = (): boolean =>
  process.stdin.isTTY === true &&
  process.stdout.isTTY === true &&
  !isCiEnvironment() &&
  !isCodingAgentEnvironment() &&
  process.env.TERM !== "dumb";
