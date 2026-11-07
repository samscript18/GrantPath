import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { DomainInputError } from "@/lib/errors";
import { HttpError } from "@/lib/http";
import type { Actor } from "./auth";
import { uploadAvatar, queueMediaCleanup } from "./cloudinary";
import { lockAccount } from "./security";

export const accountNameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(100, "Use 100 characters or fewer.");

export function photoVersion(image: string | null) {
  return createHash("sha256")
    .update(image || "")
    .digest("hex");
}

export async function saveAccountName(actor: Actor, input: unknown) {
  const data = z
    .object({ name: accountNameSchema, previousName: z.string().max(1000) })
    .strict()
    .parse(input);
  const result = await db().user.updateMany({
    where: { id: actor.id, name: data.previousName },
    data: { name: data.name },
  });
  if (result.count !== 1)
    throw new HttpError(409, "Your name changed in another tab. Reload before saving.");
  return { name: data.name };
}

export async function saveAccountPhoto(actor: Actor, input: unknown) {
  const data = z
    .object({
      image: z
        .string()
        .max(90_000)
        .regex(
          /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/,
          "Choose a supported profile photo.",
        )
        .nullable(),
      previousVersion: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict()
    .parse(input);
  const previous = await db().user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { image: true, imagePublicId: true },
  });
  if (photoVersion(previous.image) !== data.previousVersion)
    throw new HttpError(409, "Your photo changed in another tab. Reload before saving.");

  let image: string | null = null;
  let normalized: Buffer | null = null;
  if (data.image !== null) {
    const buffer = Buffer.from(data.image.slice("data:image/jpeg;base64,".length), "base64");
    if (buffer.length > 64 * 1024 || buffer[0] !== 0xff || buffer[1] !== 0xd8)
      throw new DomainInputError("Choose a smaller JPEG, PNG or WebP photo.");
    try {
      const { default: sharp } = await import("sharp");
      // Re-encode instead of preserving uploaded metadata or trusting a MIME label.
      normalized = await sharp(buffer, { limitInputPixels: 1_000_000, failOn: "warning" })
        .rotate()
        .resize(256, 256, { fit: "cover" })
        .jpeg({ quality: 80 })
        .timeout({ seconds: 3 })
        .toBuffer();
      if (normalized.length > 64 * 1024) throw new Error("Image too large");
    } catch {
      throw new DomainInputError(
        "This photo could not be processed. Choose another JPEG, PNG or WebP image.",
      );
    }
  }
  const uploaded = normalized ? await uploadAvatar(actor.id, normalized) : null;
  image = uploaded?.image || null;
  const result = await db().$transaction(async (tx) => {
    const cleanupEventIds: string[] = [];
    await lockAccount(tx, actor.id);
    const changed = await tx.user.updateMany({
      where: { id: actor.id, image: previous.image },
      data: { image, imagePublicId: uploaded?.asset.publicId || null },
    });
    if (changed.count !== 1) {
      if (uploaded) await queueMediaCleanup(tx, uploaded.asset.publicId, actor.id);
      return { saved: false, cleanupEventIds };
    }
    if (uploaded)
      await tx.mediaAsset.update({ where: { id: uploaded.asset.id }, data: { state: "active" } });
    if (previous.imagePublicId) {
      const cleanup = await queueMediaCleanup(tx, previous.imagePublicId, actor.id);
      if (cleanup) cleanupEventIds.push(cleanup.id);
    }
    return { saved: true, cleanupEventIds };
  });
  if (!result.saved)
    throw new HttpError(409, "Your photo changed in another tab. Reload before saving.");
  return { image, version: photoVersion(image), cleanupEventIds: result.cleanupEventIds };
}
