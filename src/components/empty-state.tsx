import { Sprout } from "lucide-react";
export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty-state relative overflow-hidden rounded-xl border border-dashed border-border bg-paper/70 px-6 py-14 text-center sm:py-18">
      <span aria-hidden="true" className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full border border-border bg-secondary/65 ring-8 ring-secondary/20"><Sprout className="text-leaf" size={28} strokeWidth={1.2} /></span>
      <h2 className="editorial mx-auto max-w-md text-[28px] leading-tight">{title}</h2>
      <div className="mx-auto mt-4 max-w-md text-[13px] leading-7 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
