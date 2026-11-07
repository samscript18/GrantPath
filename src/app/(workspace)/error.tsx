"use client";

import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function WorkspaceError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section className="paper mx-auto my-10 max-w-xl p-7 sm:p-10">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-secondary">
        <Sprout size={23} strokeWidth={1.3} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-7 text-muted-foreground">A PAUSE ALONG THE WAY</p>
      <h1 className="editorial mt-4 text-4xl">Let’s try that again.</h1>
      <p className="mt-5 mb-7 text-sm leading-7 text-muted-foreground">
        We couldn’t retrieve this page. Your saved information is still there. Try again in a
        moment, or use the navigation to keep exploring.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/scholarships">Explore scholarships</Link>
        </Button>
      </div>
    </section>
  );
}
