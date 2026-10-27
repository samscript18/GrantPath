import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full min-h-11 rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/65 focus:border-primary/60 focus:bg-paper focus:ring-3 focus:ring-primary/10 disabled:opacity-50 aria-invalid:border-danger-foreground",
        className,
      )}
      {...props}
    />
  );
}
