// Bin entry. Owns the process: argv parsing, exit codes, error reporting.
// runCli stays in index.ts as a pure async function so it remains testable.
import { runCli } from "./index.js";

const argv = process.argv.slice(2);

runCli(argv).then(
  (exitCode) => process.exit(exitCode),
  (error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`move-doctor: ${message}\n`);
    process.exit(1);
  }
);
