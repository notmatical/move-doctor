import { colorEnabled } from "core";

// OSC 8 hyperlinks are supported by most modern terminals (Windows Terminal,
// iTerm2, WezTerm, GNOME Terminal, …). We only emit them on an interactive,
// colour-capable stdout; piped/CI output falls back to plain text so logs stay
// clean and parseable.
const supportsHyperlinks = (): boolean =>
  process.stdout.isTTY === true && colorEnabled();

const ESC = String.fromCharCode(27); // \x1b
const BEL = String.fromCharCode(7); // \x07

// OSC 8 form: ESC ] 8 ; ; <url> BEL <text> ESC ] 8 ; ; BEL
export const hyperlink = (text: string, url: string): string =>
  supportsHyperlinks() ? `${ESC}]8;;${url}${BEL}${text}${ESC}]8;;${BEL}` : text;
