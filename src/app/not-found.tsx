import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatePage } from "@/components/state-page";
export default function NotFound() {
  return (
    <StatePage
      eyebrow="404 · A DIFFERENT DIRECTION"
      title="This path doesn’t lead anywhere."
      description="The opportunity may have moved, or this link may be incomplete. There are other possibilities waiting to be explored."
    >
      <Button asChild>
        <Link href="/scholarships">Explore scholarships</Link>
      </Button>
    </StatePage>
  );
}
