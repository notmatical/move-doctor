import { BookText, Terminal, Zap } from "lucide-react";

import { CodePanel } from "@/components/landing/code-panel";
import { FeatureCard } from "@/components/landing/feature-card";
import { ScorePanel } from "@/components/landing/score-panel";

const FEATURES = [
  {
    icon: <BookText className="size-4" />,
    title: "Every rule cited",
    description:
      "Each finding links to the exact Move Book section or concept page behind it, so you can check the reasoning instead of trusting a black box.",
  },
  {
    icon: <Terminal className="size-4" />,
    title: "Built for coding agents",
    description:
      "move-doctor install drops a SKILL.md into Claude Code, Cursor, and more. Your agent fetches each rule's fix recipe and applies it for you.",
  },
  {
    icon: <Zap className="size-4" />,
    title: "Folds in sui --lint",
    description:
      "With the Sui CLI on PATH, the compiler's own lints run in the same pass and fold into one score, so you read a single report.",
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
