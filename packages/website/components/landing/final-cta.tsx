import { CopyCommand } from "@/components/copy-command";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-6 py-28">
      <div
        aria-hidden
        className="aurora pointer-events-none absolute inset-x-0 -bottom-24 h-[42rem] rotate-180"
      />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-balance font-medium text-4xl tracking-[-0.03em] sm:text-5xl">
          Run it on your codebase
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          No install, no config. Scan in seconds.
        </p>
        <div className="mt-9">
          <CopyCommand command="npx move-doctor@latest" />
        </div>
      </div>
    </section>
  );
}
