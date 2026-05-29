import { ScoreCard } from "./score-card";
import { Terminal } from "./terminal";

// A verbatim reproduction of a real `npx move-doctor` workspace run. This is the
// hero — what the site promises is exactly what the terminal prints.
export const HeroDemo = () => (
  <Terminal title="unions.money — npx move-doctor">
    <div className="space-y-1">
      <div>
        <span className="text-[var(--color-fainter)]">$</span>{" "}
        <span className="text-[var(--color-paper)]">
          npx move-doctor@latest
        </span>
      </div>
      <div className="h-2" />
      <div>
        <span className="font-bold text-[var(--color-paper)]">move-doctor</span>{" "}
        <span className="text-[var(--color-fainter)]">v0.1.0</span>{" "}
        <span className="text-[var(--color-fainter)]">·</span>{" "}
        <span className="text-[var(--color-fainter)]">move.doctor</span>
      </div>
      <div>
        <span className="text-[var(--color-ok)]">✓</span>{" "}
        <span className="font-bold text-[var(--color-paper)]">
          unions.money
        </span>{" "}
        <span className="text-[var(--color-fainter)]">
          · 5 packages · Sui 1.39.2
        </span>
      </div>
      <div className="h-3" />
      <ScoreCard
        edition="2024.beta"
        fileCount={42}
        packages={[
          {
            name: "packages/vault",
            score: 59,
            errors: 3,
            warnings: 5,
            info: 2,
          },
          { name: "packages/core", score: 87, errors: 1, warnings: 1, info: 2 },
          {
            name: "packages/oracle",
            score: 100,
            errors: 0,
            warnings: 0,
            info: 0,
          },
          {
            name: "packages/router",
            score: 100,
            errors: 0,
            warnings: 0,
            info: 0,
          },
          {
            name: "packages/utils",
            score: 100,
            errors: 0,
            warnings: 0,
            info: 0,
          },
        ]}
        projectName="unions.money"
        score={59}
        suiVersion="1.39.2"
        totals={{ errors: 4, warnings: 6, info: 18 }}
      />
      <div className="h-3" />
      <div className="text-[var(--color-fainter)]">
        · For details:{" "}
        <span className="text-[var(--color-accent)]">
          npx move-doctor@latest --verbose
        </span>
      </div>
      <div className="cursor-blink text-[var(--color-fainter)]">
        · Set up CI for this workspace:{" "}
        <span className="text-[var(--color-accent)]">
          npx move-doctor install
        </span>
      </div>
    </div>
  </Terminal>
);
