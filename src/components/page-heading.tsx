export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow mb-3 text-muted-foreground">{eyebrow}</p><h1 className="editorial text-4xl sm:text-[44px]">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p></div>{children}</div>;
}
