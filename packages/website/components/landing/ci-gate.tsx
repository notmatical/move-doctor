import Link from "next/link";

import { AnimatedArrow } from "@/components/animated-arrow";
import { AnalyzingTerminal } from "@/components/landing/analyzing-terminal";
import { Panel } from "@/components/landing/panel";
import { MARKETPLACE } from "@/lib/links";

export function CiGate() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <Panel className="grid items-center gap-8 p-6 md:grid-cols-2 md:p-8">
        <div>
          <h2 className="font-medium text-2xl tracking-[-0.02em]">
            Gate every pull request
          </h2>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            The GitHub Action reviews each PR, comments the findings inline, and
            fails the build when the score regresses.
          </p>
          <Link
            className="group mt-5 inline-flex items-center gap-1.5 font-medium text-foreground text-sm transition-colors hover:text-primary"
            href={MARKETPLACE}
            rel="noreferrer"
            target="_blank"
          >
            View on GitHub Marketplace
            <AnimatedArrow className="size-4" />
          </Link>
        </div>

        <AnalyzingTerminal />
      </Panel>
    </section>
  );
}
