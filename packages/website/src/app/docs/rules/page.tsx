import Link from "next/link";
import { allRules, BUCKET_BLURB, rulesByBucket } from "@/lib/rules";

export const dynamic = "force-static";

const severityColor = (severity: string): string => {
  if (severity === "error") {
    return "text-[var(--color-error)]";
  }
  if (severity === "warning") {
    return "text-[var(--color-warn)]";
  }
  return "text-[var(--color-faint)]";
};

const RulesIndexPage = () => (
  <div className="space-y-12">
    <div className="space-y-2">
      <div className="text-[var(--color-faint)] text-sm">
        <Link className="hover:text-[var(--color-accent)]" href="/">
          ← Home
        </Link>
      </div>
      <h1 className="font-bold text-4xl tracking-tight">Rule catalog</h1>
      <p className="text-[var(--color-faint)]">
        {allRules.length} rules. Every rule cites the canonical source — Move
        Book section or named audit post.
      </p>
    </div>

    {rulesByBucket.map(({ bucket, count, rules }) => (
      <section className="scroll-mt-20 space-y-4" id={bucket} key={bucket}>
        <div>
          <h2 className="font-bold text-2xl capitalize">
            {bucket}{" "}
            <span className="font-normal text-[var(--color-faint)] text-base">
              · {count} rules
            </span>
          </h2>
          <p className="mt-1 text-[var(--color-faint)] text-sm">
            {BUCKET_BLURB[bucket]}
          </p>
        </div>
        <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-md border border-[var(--color-border)]">
          {rules.map((rule) => (
            <Link
              className="flex items-center justify-between px-4 py-3 transition hover:bg-[var(--color-border)]/40"
              href={`/docs/rules/${rule.bucket}/${rule.slug}` as never}
              key={rule.id}
            >
              <div className="flex items-center gap-3">
                <code className="text-sm">{rule.id}</code>
                {rule.citation ? (
                  <span className="text-[var(--color-faint)] text-xs">
                    {rule.citation}
                  </span>
                ) : null}
              </div>
              <span
                className={`font-semibold text-xs uppercase ${severityColor(rule.severity)}`}
              >
                {rule.severity}
              </span>
            </Link>
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default RulesIndexPage;
