import { highlighter } from "core";
import { HOMEPAGE } from "../constants.js";
import { glyph } from "./glyphs.js";
import { hyperlink } from "./terminal.js";

export const VERSION = process.env.MOVE_DOCTOR_VERSION ?? "dev";

export const printBrandedHeader = (): void => {
  const wordmark = highlighter.accent(hyperlink("move.doctor", HOMEPAGE));
  process.stdout.write(
    `\n  ${highlighter.accent(glyph.cross)} ${highlighter.bold("move-doctor")} ${highlighter.muted(`v${VERSION}`)}  ${highlighter.muted("·")}  ${wordmark}\n\n`
  );
};
