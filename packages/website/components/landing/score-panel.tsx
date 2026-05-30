import { Panel } from "@/components/landing/panel";
import { cn } from "@/lib/utils";

const SCORE = 87;

const SEVERITIES = [
  { label: "errors", value: "0", color: "bg-red-400" },
  { label: "warnings", value: "3", color: "bg-amber-400" },
  { label: "info", value: "9", color: "bg-muted-foreground" },
];

const FINDINGS = [
  {
    glyph: "⚠",
    tone: "text-amber-400",
    rule: "conventions/missing-edition-2024",
    loc: "Move.toml:2",
  },
  {
    glyph: "⚠",
    tone: "text-amber-400",
    rule: "functions/getter-uses-get-prefix",
    loc: "admin.move:10",
  },
];

export function ScorePanel() {
  return (
    <Panel className="flex h-96 flex-col p-7">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Health score</span>
        <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 font-medium text-emerald-400 text-xs ring-1 ring-emerald-400/20 ring-inset">
          good
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative grid place-items-center">
          <div
            aria-hidden
            className="absolute size-28 rounded-full bg-primary/20 blur-2xl"
          />
          <ScoreRing score={SCORE} />
        </div>

        <div className="flex items-center gap-5 text-sm">
          {SEVERITIES.map((s) => (
            <span className="inline-flex items-center gap-2" key={s.label}>
              <span className={cn("size-1.5 rounded-full", s.color)} />
              <span className="font-medium text-foreground tabular-nums">
                {s.value}
              </span>
              <span className="text-muted-foreground">{s.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 border-border/50 border-t pt-5">
        {FINDINGS.map((finding) => (
          <div
            className="flex items-center gap-2.5 font-mono text-xs"
            key={finding.rule}
          >
            <span className={finding.tone}>{finding.glyph}</span>
            <span className="truncate text-foreground/80">{finding.rule}</span>
            <span className="ml-auto shrink-0 text-muted-foreground/60">
              {finding.loc}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 150;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg aria-hidden="true" className="-rotate-90" height={size} width={size}>
        <defs>
          <linearGradient id="score-arc" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#298dff" />
            <stop offset="100%" stopColor="#6fd3ff" />
          </linearGradient>
        </defs>
        <circle
          className="text-white/[0.06]"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="url(#score-arc)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={stroke}
          style={{ filter: "drop-shadow(0 0 5px rgba(41, 141, 255, 0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold text-[2.75rem] text-foreground tabular-nums leading-none tracking-tight">
          {score}
        </span>
        <span className="mt-1.5 text-muted-foreground/70 text-xs">/ 100</span>
      </div>
    </div>
  );
}
