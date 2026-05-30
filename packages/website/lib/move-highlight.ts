// Tiny, dependency-free syntax highlighter for the Move snippets shown on the
// landing page. Not a real parser — just enough lexing to color keywords,
// types, calls, and literals so code can be authored as plain strings.

const KEYWORDS = new Set([
  "module",
  "use",
  "public",
  "entry",
  "fun",
  "let",
  "mut",
  "struct",
  "enum",
  "has",
  "const",
  "if",
  "else",
  "return",
  "while",
  "loop",
  "abort",
  "as",
  "native",
  "friend",
  "spec",
  "copy",
  "drop",
  "store",
  "key",
  "phantom",
  "package",
  "macro",
]);

export type TokenKind =
  | "keyword"
  | "type"
  | "fn"
  | "macro"
  | "num"
  | "comment"
  | "punct"
  | "plain"
  | "space";

export interface Token {
  kind: TokenKind;
  value: string;
}

export const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: "text-violet-400",
  type: "text-amber-300",
  fn: "text-sky-300",
  macro: "text-sky-300",
  num: "text-emerald-300",
  comment: "text-muted-foreground/70 italic",
  punct: "text-muted-foreground",
  plain: "text-foreground/90",
  space: "",
};

// Order matters: whitespace, comments, identifiers, numbers, multi-char ops,
// single punctuation, then a catch-all so no character is ever dropped.
const SCAN =
  /\s+|\/\/[^\n]*|[A-Za-z_]\w*!?|\d[\w.]*|->|::|[(){}[\],;:.&=<>+\-*/|]|./g;

export function highlightMove(line: string): Token[] {
  const raw = line.match(SCAN) ?? [];
  const tokens: Token[] = [];

  for (let i = 0; i < raw.length; i++) {
    const value = raw[i];

    if (/^\s/.test(value)) {
      tokens.push({ value, kind: "space" });
      continue;
    }
    if (value.startsWith("//")) {
      tokens.push({ value, kind: "comment" });
      continue;
    }
    if (/^\d/.test(value)) {
      tokens.push({ value, kind: "num" });
      continue;
    }
    if (/^[A-Za-z_]/.test(value)) {
      tokens.push({ value, kind: classifyWord(value, nextToken(raw, i)) });
      continue;
    }
    tokens.push({ value, kind: "punct" });
  }

  return tokens;
}

function nextToken(raw: string[], from: number): string {
  let j = from + 1;
  while (j < raw.length && /^\s/.test(raw[j])) {
    j++;
  }
  return raw[j] ?? "";
}

function classifyWord(value: string, next: string): TokenKind {
  if (value.endsWith("!")) {
    return "macro";
  }
  if (KEYWORDS.has(value)) {
    return "keyword";
  }
  // a call or a module/type path segment
  if (next === "(" || next === "::") {
    return "fn";
  }
  if (/^[A-Z]/.test(value)) {
    return "type";
  }
  return "plain";
}
