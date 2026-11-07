import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { DomainInputError } from "@/lib/errors";
import { HttpError } from "@/lib/http";
import { requireOperator, type Actor } from "@/server/accounts/auth";
import { queueMediaCleanup, uploadProviderImage } from "@/server/accounts/cloudinary";
export const providerImageVersion = (image: string | null) =>
  createHash("sha256")
    .update(image || "")
    .digest("hex");
export async function saveProviderImage(actor: Actor, input: unknown) {
  requireOperator(actor);
  const data = z
    .object({
      providerId: z.string().min(1).max(150),
      previousVersion: z.string().regex(/^[a-f0-9]{64}$/),
      image: z
        .string()
        .max(90_000)
        .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)
        .nullable(),
      sourceUrl: z
        .url()
        .max(2000)
        .refine((value) => new URL(value).protocol === "https:")
        .optional(),
      alt: z.string().trim().min(3).max(180).optional(),
    })
    .strict()
    .parse(input);
  const previous = await db().provider.findUniqueOrThrow({ where: { id: data.providerId } });
  if (providerImageVersion(previous.imageUrl) !== data.previousVersion)
    throw new HttpError(409, "The provider image changed in another tab. Reload before saving.");
  if (data.image && (!data.sourceUrl || !data.alt))
    throw new DomainInputError("Add the official image source and a short image description.");
  if (data.image && data.sourceUrl) {
    const source = new URL(data.sourceUrl);
    const official = new URL(previous.url);
    if (
      source.hostname.replace(/^www\./, "") !== official.hostname.replace(/^www\./, "") ||
      source.username ||
      source.password ||
      source.port
    )
      throw new DomainInputError(
        "Use a source page on this provider’s registered official website.",
      );
  }
  let uploaded: Awaited<ReturnType<typeof uploadProviderImage>> | null = null;
  if (data.image) {
    const bytes = Buffer.from(data.image.slice("data:image/jpeg;base64,".length), "base64");
    if (bytes.length > 64 * 1024) throw new DomainInputError("Choose a smaller image.");
    let normalized: Buffer;
    try {
      const { default: sharp } = await import("sharp");
      normalized = await sharp(bytes, { limitInputPixels: 2_000_000, failOn: "warning" })
        .rotate()
        .resize(512, 512, { fit: "contain", background: "#fffefa" })
        .jpeg({ quality: 82 })
        .timeout({ seconds: 3 })
        .toBuffer();
      if (normalized.length > 96 * 1024) throw new Error("Image too large");
    } catch {
      throw new DomainInputError(
        "This image could not be processed. Choose a JPEG, PNG or WebP image.",
      );
    }
    uploaded = await uploadProviderImage(previous.id, normalized);
  }
  const owner = `provider:${previous.id}`;
  const result = await db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${owner}))`;
    const changed = await tx.provider.updateMany({
      where: { id: previous.id, imageUrl: previous.imageUrl },
      data: {
        imageUrl: uploaded?.image || null,
        imagePublicId: uploaded?.asset.publicId || null,
        imageSourceUrl: data.image ? data.sourceUrl : null,
        imageAlt: data.image ? data.alt : null,
        imageUpdatedAt: new Date(),
      },
    });
    if (!changed.count) {
      if (uploaded) await queueMediaCleanup(tx, uploaded.asset.publicId, owner);
      return { saved: false, cleanupEventIds: [] as string[] };
    }
    if (uploaded)
      await tx.mediaAsset.update({ where: { id: uploaded.asset.id }, data: { state: "active" } });
    const cleanup = previous.imagePublicId
      ? await queueMediaCleanup(tx, previous.imagePublicId, owner)
      : null;
    await tx.audit.create({
      data: {
        actorId: actor.id,
        action: "provider.image",
        recordId: previous.id,
        before: { imageUrl: previous.imageUrl },
        after: { imageUrl: uploaded?.image || null, sourceUrl: data.sourceUrl || null },
        reason: data.image
          ? "Provider image supplied with official source attribution."
          : "Provider image removed; initials remain as the display fallback.",
      },
    });
    return { saved: true, cleanupEventIds: cleanup ? [cleanup.id] : [] };
  });
  if (!result.saved)
    throw new HttpError(409, "The provider image changed in another tab. Reload before saving.");
  return {
    imageUrl: uploaded?.image || null,
    version: providerImageVersion(uploaded?.image || null),
    cleanupEventIds: result.cleanupEventIds,
  };
}
