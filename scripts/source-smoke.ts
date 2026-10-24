import "dotenv/config";
import { db } from "../src/lib/db";
import { checkSource } from "../src/server/monitoring/worker";
async function main() {
  for (const adapter of ["ucl-scholarship", "oxford-clarendon", "twente-uts"]) {
    const source = await db().source.findFirst({ where: { adapter }, orderBy: { url: "asc" } });
    if (!source) {
      console.log(`${adapter}: not registered`);
      continue;
    }
    console.log(`Checking ${adapter}: ${source.url} (manual; cadence remains paused)`);
    const result = await checkSource(source.id, true);
    const record = await db().source.findUniqueOrThrow({
      where: { id: source.id },
      include: { observations: { orderBy: { attemptedAt: "desc" }, take: 1 } },
    });
    console.log(
      JSON.stringify({
        adapter,
        result,
        lastAttemptAt: record.lastAttemptAt,
        lastSuccessAt: record.lastSuccessAt,
        diagnostic: record.observations[0]?.error || null,
      }),
    );
  }
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => db().$disconnect());
