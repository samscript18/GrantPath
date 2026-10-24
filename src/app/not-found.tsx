import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl p-10">
      <p className="eyebrow">A different direction</p>
      <h1 className="editorial mt-5 text-4xl">This path doesn’t lead anywhere.</h1>
      <p className="my-6 text-muted-foreground">
        The opportunity may have moved, or this link may be incomplete.
      </p>
      <Button asChild>
        <Link href="/scholarships">Explore scholarships</Link>
      </Button>
    </main>
  );
}
