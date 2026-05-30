import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-white/[0.04] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_70px_-40px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      {children}
    </div>
  );
}
