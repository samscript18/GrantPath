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
    <div className="page-heading mb-9 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0 max-w-3xl">
        <p className="eyebrow mb-4 flex items-center gap-2.5 text-muted-foreground">
          <span aria-hidden="true" className="h-px w-6 bg-accent" />
          {eyebrow}
        </p>
        <h1 className="editorial text-[36px] leading-[1.12] sm:text-[46px] lg:text-[50px]">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
