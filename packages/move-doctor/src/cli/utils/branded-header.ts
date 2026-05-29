import { highlighter } from "core";

export const VERSION = "0.1.0";

export const printBrandedHeader = (): void => {
  process.stdout.write(
    `\n  ${highlighter.bold("move-doctor")} ${highlighter.muted(`v${VERSION}`)}  ${highlighter.muted("·")}  ${highlighter.accent("move.doctor")}\n\n`
  );
};
