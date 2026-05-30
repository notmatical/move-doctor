import { BookText, Terminal, Zap } from "lucide-react";

import { CodePanel } from "@/components/landing/code-panel";
import { FeatureCard } from "@/components/landing/feature-card";
import { ScorePanel } from "@/components/landing/score-panel";

const FEATURES = [
  {
    icon: <BookText className="size-4" />,
    title: "Every rule cited",
    description:
      "Every rule links to its exact section of The Move Book or the relevant concept page. No vibes.",
  },
  {
    icon: <Terminal className="size-4" />,
    title: "Built for coding agents",
    description:
      "One command drops a SKILL.md into your agents so they fetch the fix recipe and patch the code themselves.",
  },
  {
    icon: <Zap className="size-4" />,
    title: "Folds in sui --lint",
    description:
      "When the Sui CLI is on PATH, its compiler lints run alongside and feed the same score.",
  },
];

export function Showcase() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ScorePanel />
        <CodePanel />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
