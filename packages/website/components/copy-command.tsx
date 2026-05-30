"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { cn } from "@/lib/utils";

export function CopyCommand({
  command,
  className,
}: {
  command: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard
      ?.writeText(command)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {
        // clipboard unavailable, no-op
      });
  };

  return (
    <button
      aria-label="Copy install command"
      className={cn(
        "group inline-flex items-center justify-between gap-4 rounded-xl border border-border bg-card/70 py-3 pr-3 pl-4 font-mono text-sm shadow-sm backdrop-blur transition-colors hover:border-input hover:bg-card",
        className
      )}
      onClick={onCopy}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="select-none text-muted-foreground">$</span>
        <AnimatedShinyText className="max-w-none text-foreground/80">
          {command}
        </AnimatedShinyText>
      </span>
      <span className="grid size-7 place-items-center rounded-md border border-border bg-background/60 text-muted-foreground transition-colors group-hover:text-foreground">
        {copied ? (
          <Check className="size-3.5 text-primary" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
    </button>
  );
}
