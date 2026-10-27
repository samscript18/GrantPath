import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <section className="paper mx-auto my-10 max-w-xl p-7 sm:p-10">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-secondary">
        <Compass size={24} strokeWidth={1.3} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-7 text-muted-foreground">A DIFFERENT DIRECTION</p>
      <h1 className="editorial mt-4 text-4xl">This path doesn’t lead anywhere.</h1>
      <p className="mt-5 mb-7 text-sm leading-7 text-muted-foreground">
        This page may have moved, or the link may be incomplete. There are other possibilities
        waiting in the catalogue.
      </p>
      <Button asChild>
        <Link href="/scholarships">Explore scholarships</Link>
      </Button>
    </section>
  );
}
