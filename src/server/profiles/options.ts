import { db } from "@/lib/db";
export async function institutionChoices() {
  const providers = await db().provider.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return providers
    .map((provider) => provider.name)
    .filter((name) => /university|college|institute|ETH|Sciences Po/i.test(name));
}
