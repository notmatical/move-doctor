import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { loadPlaybook } from "@/lib/per-rule-md";
import { allRules, findRule } from "@/lib/rules";

export const dynamic = "force-static";

export const generateStaticParams = () =>
  allRules.map((rule) => ({ bucket: rule.bucket, rule: rule.slug }));

interface PageProps {
  params: Promise<{ bucket: string; rule: string }>;
}

const severityColor = (severity: string): string => {
  if (severity === "error") {
    return "text-[var(--color-error)] bg-[var(--color-error)]/10";
  }
  if (severity === "warning") {
    return "text-[var(--color-warn)] bg-[var(--color-warn)]/10";
  }
  return "text-[var(--color-faint)] bg-[var(--color-surface-2)]";
};

const RulePage = async ({ params }: PageProps) => {
  const { bucket, rule: ruleSlug } = await params;
  const rule = findRule(bucket, ruleSlug);
  if (!rule) {
    notFound();
  }

  const { markdown } = await loadPlaybook(rule);
  const promptUrl = `/prompts/rules/${rule.bucket}/${rule.slug}.md`;

  return (
    <article className="space-y-8">
      <div className="flex items-center gap-2 text-[var(--color-faint)] text-sm">
        <Link className="hover:text-[var(--color-accent)]" href="/docs/rules">
          ← All rules
        </Link>
        <span>/</span>
        <Link
          className="capitalize hover:text-[var(--color-accent)]"
          href={`/docs/rules#${rule.bucket}`}
        >
          {rule.bucket}
        </Link>
      </div>

      <header className="space-y-3 border-[var(--color-border)] border-b pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-bold text-3xl tracking-tight">
            <code>{rule.id}</code>
          </h1>
          <span
            className={`rounded px-2 py-1 font-semibold text-xs uppercase ${severityColor(
              rule.severity
            )}`}
          >
            {rule.severity}
          </span>
        </div>
        <div className="space-x-4 text-[var(--color-faint)] text-sm">
          {rule.citation ? (
            <span>
              Citation:{" "}
              {rule.citationUrl ? (
                <a
                  className="underline hover:text-[var(--color-accent)]"
                  href={rule.citationUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {rule.citation}
                </a>
              ) : (
                rule.citation
              )}
            </span>
          ) : null}
          <span>
            Kind: {rule.kind === "manifest" ? "Move.toml" : ".move file"}
          </span>
        </div>
      </header>

      {markdown ? (
        <Markdown>{markdown}</Markdown>
      ) : (
        <div className="rounded-md border border-[var(--color-border)] border-dashed p-6 text-[var(--color-faint)] text-sm">
          <p>
            Per-rule playbook hasn't been authored yet. The rule's runtime
            message and fix hint still ship — see the source in{" "}
            <a
              className="underline"
              href={`https://github.com/notmatical/move-doctor/blob/main/packages/rules/src/rules/${rule.bucket}/${rule.slug}.ts`}
            >
              <code>
                packages/rules/src/rules/{rule.bucket}/{rule.slug}
                .ts
              </code>
            </a>
            .
          </p>
        </div>
      )}

      <footer className="space-y-1 border-[var(--color-border)] border-t pt-6 text-[var(--color-faint)] text-sm">
        <p>
          Raw playbook (for agent fetch):{" "}
          <a className="underline" href={promptUrl}>
            <code>{promptUrl}</code>
          </a>
        </p>
      </footer>
    </article>
  );
};

export default RulePage;
