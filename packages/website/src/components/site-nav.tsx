import Link from "next/link";

export const SiteNav = () => (
  <nav className="sticky top-0 z-50 border-[var(--color-border)] border-b bg-[var(--color-ink)]/85 backdrop-blur-md">
    <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <Link className="font-bold font-mono text-lg tracking-tight" href="/">
        move<span className="text-[var(--color-accent)]">·</span>doctor
      </Link>
      <div className="flex items-center gap-6 text-[var(--color-faint)] text-sm">
        <Link
          className="transition hover:text-[var(--color-paper)]"
          href="/docs"
        >
          Docs
        </Link>
        <Link
          className="transition hover:text-[var(--color-paper)]"
          href="/docs/rules"
        >
          Rules
        </Link>
        <a
          className="transition hover:text-[var(--color-paper)]"
          href="https://github.com/notmatical/move-doctor"
        >
          GitHub
        </a>
      </div>
    </div>
  </nav>
);
