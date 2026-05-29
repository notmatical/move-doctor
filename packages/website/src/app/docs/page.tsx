import { readFile } from "node:fs/promises";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { repoPath } from "@/lib/repo-path";

export const dynamic = "force-static";

const DocsPage = async () => {
  const skillBody = await readFile(
    repoPath("skills", "move-doctor", "SKILL.md"),
    "utf8"
  );
  // Strip the YAML frontmatter — it's metadata for the skill loader, not user-facing docs.
  const stripped = skillBody.replace(/^---[\s\S]*?---\n/, "");

  return (
    <div className="space-y-8">
      <div className="flex items-baseline gap-4 text-[var(--color-faint)] text-sm">
        <Link className="hover:text-[var(--color-accent)]" href="/">
          ← Home
        </Link>
        <span>/</span>
        <Link className="hover:text-[var(--color-accent)]" href="/docs/rules">
          Full rule catalog →
        </Link>
      </div>
      <Markdown>{stripped}</Markdown>
    </div>
  );
};

export default DocsPage;
