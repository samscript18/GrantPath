import { describe, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import { claimEvent, failEvent } from "../../src/server/jobs/outbox";
describe("durable event leases", () => {
  it("claims once under concurrency, recovers interruption, and rejects an expired owner", async () => {
    const topic = `isolated-recovery-${crypto.randomUUID()}`;
    const now = new Date();
    const event = await db().outbox.create({
      data: { key: topic, topic, payload: { isolated: true }, availableAt: now },
    });
    const claims = await Promise.all([claimEvent([topic], now), claimEvent([topic], now)]);
    const owner = claims.find(Boolean)!;
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(owner.attempts).toBe(1);
    const later = new Date(now.getTime() + 121000);
    const recovered = (await claimEvent([topic], later))!;
    expect(recovered.id).toBe(event.id);
    expect(recovered.leaseToken).not.toBe(owner.leaseToken);
    expect(recovered.attempts).toBe(2);
    expect((await failEvent(owner, new Error("Stale worker must not write"), later)).count).toBe(0);
    await failEvent(recovered, new Error("Controlled failure"), later);
    const retry = await db().outbox.findUniqueOrThrow({ where: { id: event.id } });
    expect(retry.state).toBe("pending");
    expect(retry.error).toBe("Controlled failure");
    expect(retry.availableAt.getTime()).toBeGreaterThan(later.getTime());
    await db().outbox.delete({ where: { id: event.id } });
  });
});
