import { cn } from "@/lib/utils";

export function AnimatedArrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "size-5 transition-transform duration-150 ease-out group-hover:translate-x-0.5",
        className
      )}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      viewBox="0 0 16 16"
    >
      <path d="M8 4l4 4-4 4" />
      <path
        className="[stroke-dasharray:1] [stroke-dashoffset:1] [transition:stroke-dashoffset_150ms_ease-out] group-hover:[stroke-dashoffset:0]"
        d="M12 8H3"
        pathLength={1}
      />
    </svg>
  );
}
