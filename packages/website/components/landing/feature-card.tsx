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
      <div className="mb-4 grid size-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 ring-inset">
        {icon}
      </div>
      <h3 className="font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </Panel>
  );
}
