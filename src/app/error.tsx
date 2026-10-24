"use client";
import { Button } from "@/components/ui/button";
import { StatePage } from "@/components/state-page";
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <StatePage
      eyebrow="A PAUSE ALONG THE WAY"
      title="We couldn’t load this page."
      description="We couldn’t retrieve your information. Try again in a moment. If this continues, contact the GrantPath administrator."
    >
      <Button onClick={retry}>Try again</Button>
    </StatePage>
  );
}
