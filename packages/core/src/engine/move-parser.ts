import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Language, Parser, type Parser as ParserType } from "web-tree-sitter";

// Resolves the committed Move grammar wasm across the three contexts it runs in:
//   1. MOVE_DOCTOR_GRAMMAR_WASM override (tests / packaging escape hatch)
//   2. next to the bundled CLI (tsup copies it into dist/)
//   3. core/assets/ — both core/src/engine and core/dist/engine sit two levels
//      under core/, so one relative path covers dev + built-lib + unit tests.
const resolveGrammarWasmPath = (): string | null => {
  const candidates = [
    process.env.MOVE_DOCTOR_GRAMMAR_WASM,
    fileURLToPath(new URL("./tree-sitter-move.wasm", import.meta.url)),
    fileURLToPath(
      new URL("../../assets/tree-sitter-move.wasm", import.meta.url)
    ),
  ];
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

// Tree-sitter init + grammar load is async and one-time. We memoize the promise
// (including the failure case → null) so a missing/broken grammar degrades to
// "no AST rules" instead of throwing. Regex rules are unaffected.
let parserPromise: Promise<ParserType | null> | null = null;

const initParser = async (): Promise<ParserType | null> => {
  const wasmPath = resolveGrammarWasmPath();
  if (wasmPath === null) {
    return null;
  }
  await Parser.init();
  const language = await Language.load(wasmPath);
  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
};

export const getMoveParser = (): Promise<ParserType | null> => {
  parserPromise ??= initParser().catch(() => null);
  return parserPromise;
};

// Reset memoization — test-only seam so a test can point at a different wasm.
export const resetMoveParser = (): void => {
  parserPromise = null;
};
