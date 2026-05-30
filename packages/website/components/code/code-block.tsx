import { highlightMove, TOKEN_CLASS } from "@/lib/move-highlight";
import { cn } from "@/lib/utils";

export interface CodeLine {
  code: string;
  no?: number | string;
  // "remove" = error fix (red), "flag" = warning (amber), "add" = the fix (green)
  tone?: "add" | "remove" | "flag";
}

export function CodeBlock({
  lines,
  className,
}: {
  lines: CodeLine[];
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-x-auto py-4 font-mono text-[13px] leading-[1.7]",
        className
      )}
    >
      <code className="block">
        {lines.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static, non-reordering source listing
          <CodeRow key={i} line={line} />
        ))}
      </code>
    </pre>
  );
}

function CodeRow({ line }: { line: CodeLine }) {
  const sign = signFor(line.tone);

  return (
    <div
      className={cn(
        "flex px-5",
        line.tone === "add" && "bg-emerald-400/10",
        line.tone === "remove" && "bg-red-400/10",
        line.tone === "flag" && "bg-amber-400/10"
      )}
    >
      <span className="w-5 shrink-0 select-none text-right text-muted-foreground/40">
        {line.no}
      </span>
      <span
        className={cn(
          "w-5 shrink-0 select-none text-center",
          line.tone === "add" && "text-emerald-400",
          line.tone === "remove" && "text-red-400",
          line.tone === "flag" && "text-amber-400"
        )}
      >
        {sign}
      </span>
      <span className="whitespace-pre">
        {highlightMove(line.code).map((token, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional and never reorder
          <span className={TOKEN_CLASS[token.kind]} key={i}>
            {token.value}
          </span>
        ))}
      </span>
    </div>
  );
}

function signFor(tone: CodeLine["tone"]): string {
  if (tone === "add") {
    return "+";
  }
  if (tone === "remove" || tone === "flag") {
    return "-";
  }
  return "";
}
