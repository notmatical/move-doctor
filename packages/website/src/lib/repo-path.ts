import * as path from "node:path";

/**
 * Resolve a path inside the repository root (two levels up from packages/website/).
 * Used to read SKILL.md, README.md, and docs/rules/<bucket>/<rule>.md at build time.
 */
export const repoPath = (...segments: string[]): string =>
  path.resolve(process.cwd(), "..", "..", ...segments);
