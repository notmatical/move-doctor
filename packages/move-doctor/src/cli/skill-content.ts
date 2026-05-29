// GENERATED FILE — do not edit by hand.
// Source: skills/move-doctor/SKILL.md (embedded at build time by scripts/embed-skill.mjs).
// Re-run `bun scripts/embed-skill.mjs` (or `bun run build`, which calls prebuild) to refresh.

export const SKILL_MD_CONTENT = `---
name: move-doctor
description: Use when finishing a Sui Move feature, fixing a bug, before committing Move code, or when the user types /movedoctor, asks to scan, triage, or clean up Move diagnostics. Covers Move Book conventions, Move 2024 idioms, ability mistakes, testing style, and security best practices.
version: "0.1.0"
---

# Move Doctor

Scans Sui Move codebases for convention, idiom, ability, testing, and security issues. Outputs a 0–100 health score.

## After making Move code changes

Run \`npx move-doctor@latest --verbose --diff\` and check the score did not regress. If it dropped, fix the regressions before committing.

## For a full cleanup pass

Run \`npx move-doctor@latest --verbose\` (without \`--diff\`) to scan the whole codebase. Fix issues by severity — errors first, then warnings, then info.

## /movedoctor — full triage workflow

When the user types \`/movedoctor\`, says "run move doctor", or asks for a full triage / cleanup pass, fetch the canonical playbook and follow every step (fetching it means updates ship without a skill reinstall):

\`\`\`bash
curl --fail --silent --show-error \\
  --header 'Cache-Control: no-cache' \\
  https://move.doctor/prompts/move-doctor-agent.md
\`\`\`

It's a scan → group → triage → fix → re-score loop that edits the working tree directly (never commits, never opens PRs). For each finding, fetch the matching per-rule fix recipe on demand — \`<bucket>/<rule>\` comes straight from the diagnostic's rule id:

\`\`\`bash
curl --fail --silent --show-error \\
  https://move.doctor/prompts/rules/<bucket>/<rule>.md
\`\`\`

If the fetch fails (offline / site down), fall back to: run \`move-doctor --verbose\`, fix errors first (\`security/*\` and \`abilities/*\` findings are real vulnerabilities, not style), apply each finding's \`fixHint\` verbatim, and re-run until the score stops rising. Never suppress a rule unless you can explain why the surrounding code is a documented exception.

## Command

\`\`\`bash
npx move-doctor@latest [path] --verbose --diff   # --score for CI gating · --help for all flags
\`\`\`
`;
