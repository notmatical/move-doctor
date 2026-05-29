import type { ReactNode } from "react";

interface TerminalProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

// A terminal window chrome — traffic-light dots, a title, and a dark body.
// Used to frame any CLI output verbatim so the site reads as the product.
export const Terminal = ({
  title = "move-doctor",
  children,
  className = "",
}: TerminalProps) => (
  <div
    className={`overflow-hidden rounded-xl border border-[var(--color-border-bright)] bg-[var(--color-surface)] shadow-2xl shadow-black/40 ${className}`}
  >
    <div className="flex items-center gap-2 border-[var(--color-border)] border-b bg-[var(--color-surface-2)] px-4 py-3">
      <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
      <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
      <span className="ml-3 font-mono text-[var(--color-fainter)] text-xs">
        {title}
      </span>
    </div>
    <div className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
      {children}
    </div>
  </div>
);
