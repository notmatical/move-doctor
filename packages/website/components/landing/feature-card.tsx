import type { ReactNode } from "react";

import { Panel } from "@/components/landing/panel";

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Panel className="p-6">
      <div className="mb-4 grid size-9 place-items-center rounded-lg bg-white/[0.06] text-foreground ring-1 ring-white/10 ring-inset">
        {icon}
      </div>
      <h3 className="font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </Panel>
  );
}
