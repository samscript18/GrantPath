import { cn } from "@/lib/utils";
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "red" | "neutral";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-semibold tracking-wide",
        {
          green: "bg-success text-success-foreground",
          amber: "bg-warning text-warning-foreground",
          red: "bg-danger text-danger-foreground",
          neutral: "bg-muted text-muted-foreground",
        }[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
