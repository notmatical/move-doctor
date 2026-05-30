import { CiGate } from "@/components/landing/ci-gate";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { Showcase } from "@/components/landing/showcase";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Showcase />
      <CiGate />
      <FinalCta />
    </>
  );
}
