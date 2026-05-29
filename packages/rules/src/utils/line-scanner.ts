import type { MoveFile } from "core";

export interface LineMatch {
  column: number;
  groups: RegExpExecArray;
  line: number;
  text: string;
}

/**
 * Iterates source lines while ignoring matches inside line comments (`//`) and
 * block comments (`/* ... *\/`). Block-comment state is carried across lines.
 * Strings are NOT stripped — rules that need string-aware scanning should
 * handle that locally.
 */
export const forEachCodeLine = (
  file: MoveFile,
  callback: (line: string, lineNumber: number) => void
): void => {
  let insideBlockComment = false;
  for (let index = 0; index < file.lines.length; index += 1) {
    const rawLine = file.lines[index] ?? "";
    const codeOnly = stripComments(rawLine, { insideBlockComment });
    insideBlockComment = codeOnly.endsBlockCommentOpen;
    callback(codeOnly.text, index + 1);
  }
};

interface StripCommentsState {
  insideBlockComment: boolean;
}

interface StripCommentsResult {
  endsBlockCommentOpen: boolean;
  text: string;
}

const stripComments = (
  line: string,
  state: StripCommentsState
): StripCommentsResult => {
  let output = "";
  let blockOpen = state.insideBlockComment;
  let index = 0;
  while (index < line.length) {
    if (blockOpen) {
      const closeIndex = line.indexOf("*/", index);
      if (closeIndex === -1) {
        return { text: output, endsBlockCommentOpen: true };
      }
      index = closeIndex + 2;
      blockOpen = false;
      continue;
    }
    const next = line[index];
    const after = line[index + 1];
    if (next === "/" && after === "/") {
      return { text: output, endsBlockCommentOpen: false };
    }
    if (next === "/" && after === "*") {
      blockOpen = true;
      index += 2;
      continue;
    }
    output += next;
    index += 1;
  }
  return { text: output, endsBlockCommentOpen: blockOpen };
};

export const findAllMatches = (
  line: string,
  pattern: RegExp
): RegExpExecArray[] => {
  if (!pattern.global) {
    throw new Error(`findAllMatches requires a /g regex; got ${pattern}`);
  }
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(line)) !== null) {
    matches.push(match);
    if (match.index === pattern.lastIndex) {
      pattern.lastIndex += 1;
    }
  }
  return matches;
};

export const scanLines = (
  file: MoveFile,
  pattern: RegExp,
  onMatch: (match: LineMatch) => void
): void => {
  forEachCodeLine(file, (line, lineNumber) => {
    for (const groups of findAllMatches(line, pattern)) {
      onMatch({
        line: lineNumber,
        column: groups.index + 1,
        text: groups[0],
        groups,
      });
    }
  });
};

/**
 * Finds the matching closing `}` for an opening `{` at the given offset.
 * Returns the offset just past the `}`, or -1 if unbalanced. Ignores braces
 * inside `// ...`, `/* ... *\/`, and `"..."` strings.
 */
export const findMatchingBrace = (
  source: string,
  openBraceOffset: number
): number => findMatchingDelimiter(source, openBraceOffset, "{", "}");

/**
 * Same as findMatchingBrace but for `(` / `)`. Used by struct and function
 * declaration parsers where parameter lists can technically contain string
 * literals or comments.
 */
export const findMatchingParen = (
  source: string,
  openParenOffset: number
): number => findMatchingDelimiter(source, openParenOffset, "(", ")");

const findMatchingDelimiter = (
  source: string,
  openOffset: number,
  open: string,
  close: string
): number => {
  if (source[openOffset] !== open) {
    return -1;
  }
  let depth = 0;
  let index = openOffset;
  while (index < source.length) {
    const ch = source[index];
    const next = source[index + 1];
    if (ch === "/" && next === "/") {
      const newline = source.indexOf("\n", index);
      index = newline === -1 ? source.length : newline + 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      const closeBlock = source.indexOf("*/", index + 2);
      index = closeBlock === -1 ? source.length : closeBlock + 2;
      continue;
    }
    if (ch === '"') {
      index += 1;
      while (index < source.length && source[index] !== '"') {
        if (source[index] === "\\") {
          index += 1;
        }
        index += 1;
      }
      index += 1;
      continue;
    }
    if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
    index += 1;
  }
  return -1;
};

export const offsetToLineColumn = (
  source: string,
  offset: number
): { line: number; column: number } => {
  let line = 1;
  let lastNewline = -1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      lastNewline = index;
    }
  }
  return { line, column: offset - lastNewline };
};
