import Link from "next/link";
import { HeroDemo } from "@/components/hero-demo";
import { allRules, BUCKET_BLURB, rulesByBucket } from "@/lib/rules";

const CommandLine = ({ children }: { children: React.ReactNode }) => (
  <code className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm">
    <span className="text-[var(--color-accent)]">$</span>
    <span className="text-[var(--color-paper)]">{children}</span>
  </code>
);

const HomePage = () => {
  const totalRules = allRules.length;
  const errorRules = allRules.filter(
    (rule) => rule.severity === "error"
  ).length;
  const warningRules = allRules.filter(
    (rule) => rule.severity === "warning"
  ).length;

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="space-y-10">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[var(--color-faint)] text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
            {totalRules} rules · grounded in The Move Book + named audits
          </div>
          <h1 className="font-bold text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Your agent writes bad Move,
            <br />
            <span className="text-[var(--color-accent)]">this catches it.</span>
          </h1>
          <p className="text-[var(--color-faint)] text-lg leading-relaxed">
            A deterministic Sui Move scanner that returns a 0–100 health score,
            points your coding agent at the exact fixes, and gates every PR. One
            command, zero config.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <CommandLine>npx move-doctor@latest</CommandLine>
            <Link
              className="rounded-lg border border-[var(--color-border-bright)] px-4 py-2.5 text-[var(--color-paper)] text-sm transition hover:bg-[var(--color-surface)]"
              href="/docs"
            >
              Read the docs →
            </Link>
          </div>
        </div>

        <HeroDemo />
      </section>

      {/* Stats strip */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { value: totalRules, label: "rules across 7 categories" },
          {
            value: errorRules + warningRules,
            label: "score-impacting (errors + warnings)",
          },
          { value: 6, label: "Sui compiler lints folded in" },
        ].map((stat) => (
          <div
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            key={stat.label}
          >
            <div className="font-bold text-3xl tabular-nums">{stat.value}</div>
            <div className="mt-1 text-[var(--color-faint)] text-sm">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* What it catches */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold text-2xl tracking-tight">What it catches</h2>
          <Link
            className="text-[var(--color-faint)] text-sm transition hover:text-[var(--color-accent)]"
            href="/docs/rules"
          >
            Full catalog →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {rulesByBucket.map(({ bucket, count }) => (
            <Link
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-border-bright)]"
              href={`/docs/rules#${bucket}`}
              key={bucket}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-bold font-mono capitalize transition group-hover:text-[var(--color-accent)]">
                  {bucket}
                </h3>
                <span className="text-[var(--color-fainter)] text-xs tabular-nums">
                  {count} rules
                </span>
              </div>
              <p className="text-[var(--color-faint)] text-sm leading-relaxed">
                {BUCKET_BLURB[bucket]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Agent install */}
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-bold text-2xl tracking-tight">
            Built for coding agents
          </h2>
          <p className="text-[var(--color-faint)] leading-relaxed">
            One command installs a SKILL.md into every agent on your machine —
            Claude Code, Cursor, Codex, OpenCode, and 50 more. Your agent then
            fetches the canonical fix recipe for each finding and patches the
            code itself.
          </p>
          <CommandLine>npx move-doctor@latest install</CommandLine>
        </div>
        <div className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 font-mono text-xs">
          <div className="text-[var(--color-fainter)]">detected 8 agents</div>
          {["claude-code", "cursor", "codex", "opencode", "gemini-cli"].map(
            (agent) => (
              <div className="flex items-center gap-2" key={agent}>
                <span className="text-[var(--color-ok)]">✓</span>
                <span className="text-[var(--color-paper)]">{agent}</span>
                <span className="ml-auto text-[var(--color-fainter)]">
                  .agents/skills/move-doctor →
                </span>
              </div>
            )
          )}
          <div className="text-[var(--color-fainter)]">+ 3 more</div>
        </div>
      </section>

      {/* CI gate */}
      <section className="space-y-4">
        <h2 className="font-bold text-2xl tracking-tight">
          Gate every pull request
        </h2>
        <p className="max-w-2xl text-[var(--color-faint)] leading-relaxed">
          The <code className="text-[var(--color-accent)]">--score</code> flag
          prints just the number. Drop it into CI and fail the build when the
          score regresses.
        </p>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 font-mono text-sm leading-relaxed">
          <div>
            <span className="text-[var(--color-fainter)]">$</span>{" "}
            <span className="text-[var(--color-paper)]">
              SCORE=$(npx move-doctor@latest . --score)
            </span>
          </div>
          <div>
            <span className="text-[var(--color-fainter)]">$</span>{" "}
            <span className="text-[var(--color-paper)]">
              [ "$SCORE" -ge 80 ] || exit 1
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
