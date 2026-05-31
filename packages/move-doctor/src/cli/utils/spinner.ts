import { highlighter } from "core";
import { glyph } from "./glyphs.js";
import { isInteractive } from "./is-ci.js";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;

export interface SpinnerHandle {
  fail(text: string): void;
  stop(): void;
  succeed(text: string): void;
  update(text: string): void;
}

const ERASE_LINE = "\r\x1b[K";

export const startSpinner = (initialText: string): SpinnerHandle => {
  if (!isInteractive()) {
    process.stderr.write(`  ${highlighter.muted("…")} ${initialText}\n`);
    return {
      update: () => {},
      succeed: (text) =>
        process.stderr.write(`  ${highlighter.ok(glyph.check)} ${text}\n`),
      fail: (text) =>
        process.stderr.write(
          `  ${highlighter.error(glyph.crossMark)} ${text}\n`
        ),
      stop: () => {},
    };
  }

  let currentText = initialText;
  let frameIndex = 0;
  let finalized = false;

  const renderFrame = (): void => {
    if (finalized) {
      return;
    }
    const frame = FRAMES[frameIndex % FRAMES.length] ?? FRAMES[0];
    process.stderr.write(
      `${ERASE_LINE}  ${highlighter.accent(frame!)} ${currentText}`
    );
    frameIndex += 1;
  };

  renderFrame();
  const interval = setInterval(renderFrame, FRAME_INTERVAL_MS);

  const finalize = (icon: string, text: string): void => {
    if (finalized) {
      return;
    }
    finalized = true;
    clearInterval(interval);
    process.stderr.write(`${ERASE_LINE}  ${icon} ${text}\n`);
  };

  return {
    update: (text: string) => {
      currentText = text;
    },
    succeed: (text: string) => finalize(highlighter.ok(glyph.check), text),
    fail: (text: string) => finalize(highlighter.error(glyph.crossMark), text),
    stop: () => {
      if (finalized) {
        return;
      }
      finalized = true;
      clearInterval(interval);
      process.stderr.write(ERASE_LINE);
    },
  };
};
