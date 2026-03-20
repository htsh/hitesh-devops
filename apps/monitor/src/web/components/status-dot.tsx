import { cn } from "@/lib/utils"

const colors = {
  healthy: "bg-emerald-400",
  down: "bg-red-400",
  unknown: "bg-zinc-500",
} as const;

export function StatusDot({ health, className }: { health: string; className?: string }) {
  const color = colors[health as keyof typeof colors] ?? colors.unknown;
  return (
    <span className={cn("inline-block size-2.5 rounded-full", color, className)} />
  );
}
