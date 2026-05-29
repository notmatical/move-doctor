import { spawn } from "node:child_process";
import * as path from "node:path";

export class DiffResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiffResolutionError";
  }
}

const runGit = (cwd: string, args: readonly string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString("utf8")));
    child.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new DiffResolutionError("git is not installed or not on PATH"));
      } else {
        reject(
          new DiffResolutionError(`failed to spawn git: ${error.message}`)
        );
      }
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const cleaned = stderr.trim();
        // Detect common conditions and surface friendly messages.
        if (/not a git repository/i.test(cleaned)) {
          reject(
            new DiffResolutionError(
              "--diff requires a git repository (run from inside a git checkout, or drop --diff)"
            )
          );
        } else if (/unknown revision|bad revision/i.test(cleaned)) {
          const base = args.at(-1) ?? "HEAD";
          reject(
            new DiffResolutionError(
              `--diff base "${base}" is not a known git revision. Try \`--diff=main\` or a commit SHA.`
            )
          );
        } else {
          reject(
            new DiffResolutionError(
              `git ${args.join(" ")} exited ${code}: ${cleaned}`
            )
          );
        }
      }
    });
  });

export const resolveChangedFiles = async (
  rootDirectory: string,
  diff: boolean | string
): Promise<string[]> => {
  if (diff === false) {
    return [];
  }
  const base = typeof diff === "string" ? diff : "HEAD";
  const stdout = await runGit(rootDirectory, ["diff", "--name-only", base]);
  return stdout
    .split(/\r?\n/)
    .map((relative) => relative.trim())
    .filter((relative) => relative.length > 0 && relative.endsWith(".move"))
    .map((relative) =>
      path
        .relative(rootDirectory, path.resolve(rootDirectory, relative))
        .replace(/\\/g, "/")
    );
};
