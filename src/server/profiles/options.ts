import { studyLocationsOf } from "@/server/scholarships/locations";
import { scholarshipDataSchema } from "@/server/scholarships/schema";
import { db } from "@/lib/db";
export async function institutionChoices() {
  const providers = await db().provider.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const versions = await db().scholarship.findMany({
    where: { published: true },
    select: { versions: { orderBy: { number: "desc" }, take: 1, select: { data: true } } },
  });
  const institutions = versions.flatMap((row) => {
    const parsed = scholarshipDataSchema.safeParse(row.versions[0]?.data);
    return parsed.success ? studyLocationsOf(parsed.data).institutions.map((i) => i.name) : [];
  });
  return [...new Set([...providers.map((provider) => provider.name), ...institutions])]
    .filter((name) =>
      /university|college|institute|ETH|Sciences Po|Universitat|Universidad|Universität|Universitet/i.test(
        name,
      ),
    )
    .sort((a, b) => a.localeCompare(b));
}
