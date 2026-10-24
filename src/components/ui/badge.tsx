import { cn } from "@/lib/utils";
export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "neutral"; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-semibold tracking-wide", { green: "bg-[#e8f0e9] text-[#28553d]", amber: "bg-[#f8edcf] text-[#795410]", red: "bg-[#f9e8e3] text-[#973e30]", neutral: "bg-[#eeede6] text-[#62665d]" }[tone], className)}>{children}</span>;
}
