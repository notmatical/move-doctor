import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "error";

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const GLYPH: Record<Tone, string> = { ok: "✓", warn: "⚠", error: "✗" };

type Line =
  | { k: "cmd"; text: string }
  | { k: "find"; tone: Tone; rule: string; loc: string }
  | { k: "score"; value: string; detail: string };

const LINES: Line[] = [
  { k: "cmd", text: "move-doctor --diff origin/main" },
  {
    k: "find",
    tone: "warn",
    rule: "functions/getter-uses-get-prefix",
    loc: "admin.move:10",
  },
  {
    k: "find",
    tone: "error",
    rule: "security/public-share-of-cap",
    loc: "admin.move:7",
  },
  { k: "score", value: "87 / 100", detail: "1 error · 1 warning" },
];

function lineKey(line: Line): string {
  if (line.k === "cmd") {
    return "cmd";
  }
  if (line.k === "find") {
    return line.rule;
  }
  return "score";
}

export function AnalyzingTerminal() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-black/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <header className="flex items-center justify-between border-border/50 border-b px-4 py-2.5">
        <span className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
          <span className="size-1.5 rounded-full bg-red-400" />
          move-doctor / scan
        </span>
        <span className="rounded-full bg-red-400/10 px-2 py-0.5 font-mono text-[11px] text-red-400 ring-1 ring-red-400/20 ring-inset">
          failing
        </span>
      </header>

      <div className="px-4 py-4 font-mono text-xs leading-[1.95]">
        {LINES.map((line) => (
          <div className="flex items-center gap-2" key={lineKey(line)}>
            <Content line={line} />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-primary">$</span>
          <span className="inline-block h-3.5 w-[7px] animate-pulse rounded-[1px] bg-foreground/70" />
        </div>
      </div>
    </div>
  );
}

function Content({ line }: { line: Line }): ReactNode {
  if (line.k === "cmd") {
    return (
      <>
        <span className="text-primary">$</span>
        <span className="text-foreground/90">{line.text}</span>
      </>
    );
  }
  if (line.k === "find") {
    return (
      <>
        <span className={TONE_CLASS[line.tone]}>{GLYPH[line.tone]}</span>
        <span className="text-foreground/80">{line.rule}</span>
        <span className="ml-auto text-muted-foreground/50">{line.loc}</span>
      </>
    );
  }
  return (
    <>
      <span className="text-muted-foreground">score</span>
      <span className="font-medium text-foreground">{line.value}</span>
      <span className="text-muted-foreground/70">· {line.detail}</span>
    </>
  );
}
