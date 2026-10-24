"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main" className="mx-auto max-w-xl p-10">
      <p className="eyebrow">A pause along the way</p>
      <h1 className="editorial mt-5 text-4xl">We couldn’t load this page.</h1>
      <p className="my-6 text-sm leading-6 text-muted-foreground">
        We couldn’t retrieve your information. Try again in a moment. If this continues, contact the
        GrantPath administrator.
      </p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
