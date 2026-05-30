import Link from "next/link";

import { AnimatedArrow } from "@/components/animated-arrow";
import Aurora from "@/components/common/aurora";
import { CopyCommand } from "@/components/copy-command";
import { Button } from "@/components/ui/button";
import { LineShadowText } from "@/components/ui/line-shadow-text";
import { GITHUB, NPM } from "@/lib/links";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] opacity-70 [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
      >
        <Aurora
          amplitude={1.0}
          blend={0.5}
          colorStops={["#0a3a8f", "#298dff", "#ebf4ff"]}
          speed={1}
        />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pt-28 pb-20 text-center sm:pt-36">
        <h1 className="text-balance font-medium text-5xl leading-[0.98] tracking-[-0.03em] sm:text-7xl">
          A deterministic linter
          <br className="hidden sm:block" /> for{" "}
          <LineShadowText className="whitespace-nowrap" shadowColor="#8fcbff">
            Sui Move
          </LineShadowText>
        </h1>

        <p className="mt-7 max-w-lg text-balance text-lg text-muted-foreground leading-relaxed">
          Catches the convention, idiom, ability, and security mistakes the Sui
          compiler misses. Scored 0-100, every rule cited, built for coding
          agents.
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <CopyCommand className="w-full" command="npx move-doctor@latest" />
          <div className="grid grid-cols-2 gap-3">
            <Button
              asChild
              className="group h-11 rounded-xl bg-foreground px-6 text-background text-base hover:bg-foreground/90"
              size="lg"
            >
              <Link href={GITHUB} rel="noreferrer" target="_blank">
                Star on GitHub <AnimatedArrow />
              </Link>
            </Button>
            <Button
              asChild
              className="h-11 rounded-xl border-border/80 px-6 text-base"
              size="lg"
              variant="outline"
            >
              <Link href={NPM} rel="noreferrer" target="_blank">
                View on npm
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
