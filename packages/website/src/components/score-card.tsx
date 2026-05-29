import { scoreColorVar, scoreLabel } from "@/lib/score";

interface PackageRow {
  errors: number;
  info: number;
  name: string;
  score: number;
  warnings: number;
}

interface ScoreCardProps {
  edition: string;
  fileCount: number;
  /** Optional: render the per-package table (workspace mode). */
  packages?: PackageRow[];
  projectName: string;
  /** Headline number — for a workspace this is the worst package's score. */
  score: number;
  suiVersion?: string;
  /** Optional severity totals shown in the metadata line. */
  totals?: { errors: number; warnings: number; info: number };
}

const Divider = () => (
  <div aria-hidden className="select-none text-[var(--color-border-bright)]">
    {"─".repeat(64)}
  </div>
);

const Bar = ({ score }: { score: number }) => {
  const color = scoreColorVar(score);
  return (
    <div className="h-3 w-full overflow-hidden rounded-sm bg-[var(--color-surface-2)]">
      <div
        className="h-full rounded-sm"
        style={{
          width: `${score}%`,
          background: color,
          animation: "barfill 1s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
  );
};

const MiniBar = ({ score }: { score: number }) => {
  const color = scoreColorVar(score);
  return (
    <div className="inline-block h-2 w-24 overflow-hidden rounded-sm bg-[var(--color-surface-2)] align-middle">
      <div
        className="h-full rounded-sm"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  );
};

export const ScoreCard = ({
  score,
  projectName,
  edition,
  fileCount,
  suiVersion,
  packages,
  totals,
}: ScoreCardProps) => {
  const color = scoreColorVar(score);
  const isWorkspace = packages && packages.length > 0;

  const metaParts = [
    isWorkspace ? `${packages!.length} packages` : `${fileCount} files scanned`,
    `edition ${edition}`,
  ];
  if (totals && (totals.errors > 0 || totals.warnings > 0)) {
    metaParts.push(
      `${totals.errors} error${totals.errors === 1 ? "" : "s"} · ${totals.warnings} warning${totals.warnings === 1 ? "" : "s"}`
    );
  }
  if (suiVersion) {
    metaParts.push(`Sui ${suiVersion}`);
  }

  return (
    <div className="space-y-2">
      <Divider />
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-bold text-2xl tabular-nums" style={{ color }}>
            {score}
          </span>
          <span className="text-[var(--color-fainter)]">/ 100</span>
          <span className="text-[var(--color-fainter)]">·</span>
          <span style={{ color }}>{scoreLabel(score)}</span>
        </div>
        <span className="truncate font-bold text-[var(--color-paper)]">
          {projectName}
        </span>
      </div>
      <Bar score={score} />
      <div className="text-[var(--color-faint)] text-xs">
        {metaParts.join(" · ")}
      </div>
      <Divider />

      {isWorkspace ? (
        <div className="space-y-1.5 pt-3">
          <div className="pb-1 font-bold text-[var(--color-paper)]">
            Per-package scores
          </div>
          {packages!.map((pkg) => (
            <div className="flex items-center gap-3 text-xs" key={pkg.name}>
              <span className="w-32 truncate text-[var(--color-paper)]">
                {pkg.name}
              </span>
              <span
                className="w-8 text-right font-bold tabular-nums"
                style={{ color: scoreColorVar(pkg.score) }}
              >
                {pkg.score}
              </span>
              <MiniBar score={pkg.score} />
              <span
                className="text-[var(--color-faint)]"
                style={{ color: scoreColorVar(pkg.score) }}
              >
                {scoreLabel(pkg.score)}
              </span>
              <span className="ml-auto text-[var(--color-fainter)]">
                {pkg.errors > 0 && (
                  <span className="text-[var(--color-error)]">
                    {pkg.errors}e{" "}
                  </span>
                )}
                {pkg.warnings > 0 && (
                  <span className="text-[var(--color-warn)]">
                    {pkg.warnings}w{" "}
                  </span>
                )}
                {pkg.errors === 0 && pkg.warnings === 0 && pkg.info === 0 ? (
                  <span className="text-[var(--color-faint)]">clean</span>
                ) : (
                  pkg.info > 0 && (
                    <span className="text-[var(--color-faint)]">
                      {pkg.info}i
                    </span>
                  )
                )}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
