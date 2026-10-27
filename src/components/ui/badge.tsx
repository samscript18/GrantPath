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
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-current/8 px-2.5 py-1 text-[10px] leading-4 font-medium",
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
