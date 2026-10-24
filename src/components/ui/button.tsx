import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-[background-color,box-shadow,transform] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600",
  {
    variants: {
      variant: {
        destructive:
          "border border-transparent bg-danger-foreground text-paper shadow-sm hover:opacity-90",
        default:
          "border border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        outline: "border border-border bg-paper hover:border-primary/30 hover:bg-secondary/50",
        ghost: "hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3", lg: "h-12 px-7", icon: "size-11" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
export { Button, buttonVariants };
