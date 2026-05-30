import { Panel } from "@/components/landing/panel";

export function CiGate() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <Panel className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-10">
        <div>
          <h2 className="font-medium text-2xl tracking-[-0.02em] sm:text-3xl">
            Gate every pull request
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            The <code className="text-foreground">--score</code> flag prints
            just the number. Drop it into CI and fail the build when the score
            regresses below your budget.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-black/40 p-4 font-mono text-[13px] leading-relaxed">
          <div className="text-muted-foreground">
            <span className="text-primary">$</span> SCORE=$(npx
            move-doctor@latest . --score)
          </div>
          <div className="text-muted-foreground">
            <span className="text-primary">$</span> [ &quot;$SCORE&quot; -ge 80
            ] || exit 1
          </div>
        </div>
      </Panel>
    </section>
  );
}
