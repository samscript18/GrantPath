export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading mb-7 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0 max-w-3xl">
        <p className="eyebrow mb-3 flex items-center gap-2.5 text-muted-foreground">
          <span aria-hidden="true" className="h-px w-6 bg-accent" />
          {eyebrow}
        </p>
        <h1 className="editorial text-[32px] leading-[1.15] sm:text-[40px] lg:text-[42px]">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
