import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  canInstallNativeAgentHooks,
  installMoveDoctorAgentHooks,
  isAgentHooksInstalled,
} from "./install-agent-hooks.js";

const makeProjectRoot = (): string =>
  mkdtempSync(path.join(os.tmpdir(), "move-doctor-hooks-"));

describe("installMoveDoctorAgentHooks", () => {
  it("installs the Claude Code PostToolBatch hook + script", () => {
    const projectRoot = makeProjectRoot();
    const result = installMoveDoctorAgentHooks({
      projectRoot,
      agents: ["claude-code"],
    });

    expect(result.installedAgents).toEqual(["claude-code"]);

    const settings = JSON.parse(
      readFileSync(path.join(projectRoot, ".claude/settings.json"), "utf8")
    );
    const commands = settings.hooks.PostToolBatch.flatMap(
      (group: { hooks: { command: string }[] }) =>
        group.hooks.map((hook) => hook.command)
    );
    expect(commands).toContain(
      'sh "$CLAUDE_PROJECT_DIR/.claude/hooks/move-doctor.sh"'
    );

    const scriptPath = path.join(projectRoot, ".claude/hooks/move-doctor.sh");
    expect(existsSync(scriptPath)).toBe(true);
    expect(readFileSync(scriptPath, "utf8")).toContain(
      "move-doctor . --diff --verbose --no-banner --skip-setup"
    );
  });

  it("installs the Cursor postToolUse hook + script", () => {
    const projectRoot = makeProjectRoot();
    const result = installMoveDoctorAgentHooks({
      projectRoot,
      agents: ["cursor"],
    });

    expect(result.installedAgents).toEqual(["cursor"]);

    const config = JSON.parse(
      readFileSync(path.join(projectRoot, ".cursor/hooks.json"), "utf8")
    );
    expect(config.version).toBe(1);
    expect(config.hooks.postToolUse).toEqual([
      {
        command: ".cursor/hooks/move-doctor.sh",
        matcher: "Write|Edit|MultiEdit|ApplyPatch",
        timeout: 120,
      },
    ]);
    expect(
      existsSync(path.join(projectRoot, ".cursor/hooks/move-doctor.sh"))
    ).toBe(true);
  });

  it("is idempotent — running twice does not duplicate entries", () => {
    const projectRoot = makeProjectRoot();
    installMoveDoctorAgentHooks({
      projectRoot,
      agents: ["claude-code", "cursor"],
    });
    installMoveDoctorAgentHooks({
      projectRoot,
      agents: ["claude-code", "cursor"],
    });

    const settings = JSON.parse(
      readFileSync(path.join(projectRoot, ".claude/settings.json"), "utf8")
    );
    expect(settings.hooks.PostToolBatch).toHaveLength(1);

    const config = JSON.parse(
      readFileSync(path.join(projectRoot, ".cursor/hooks.json"), "utf8")
    );
    expect(config.hooks.postToolUse).toHaveLength(1);
  });

  it("merges into existing .claude/settings.json without clobbering other keys", async () => {
    const projectRoot = makeProjectRoot();
    await mkdir(path.join(projectRoot, ".claude"), { recursive: true });
    writeFileSync(
      path.join(projectRoot, ".claude/settings.json"),
      JSON.stringify({
        model: "claude-opus",
        hooks: {
          PreToolUse: [{ hooks: [{ type: "command", command: "echo hi" }] }],
        },
      })
    );

    installMoveDoctorAgentHooks({ projectRoot, agents: ["claude-code"] });

    const settings = JSON.parse(
      readFileSync(path.join(projectRoot, ".claude/settings.json"), "utf8")
    );
    expect(settings.model).toBe("claude-opus");
    expect(settings.hooks.PreToolUse).toHaveLength(1);
    expect(settings.hooks.PostToolBatch).toHaveLength(1);
  });

  it("ignores agents without native hook support", () => {
    const projectRoot = makeProjectRoot();
    const result = installMoveDoctorAgentHooks({
      projectRoot,
      agents: ["codex", "opencode"],
    });

    expect(result.installedAgents).toEqual([]);
    expect(result.files).toEqual([]);
    expect(isAgentHooksInstalled(projectRoot)).toBe(false);
  });
});

describe("canInstallNativeAgentHooks", () => {
  it("is true when claude-code or cursor is present", () => {
    expect(canInstallNativeAgentHooks(["codex", "cursor"])).toBe(true);
    expect(canInstallNativeAgentHooks(["claude-code"])).toBe(true);
  });

  it("is false otherwise", () => {
    expect(canInstallNativeAgentHooks(["codex", "opencode"])).toBe(false);
    expect(canInstallNativeAgentHooks([])).toBe(false);
  });
});
