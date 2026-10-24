import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { SetupError } from "@/lib/env";
import { HttpError } from "@/lib/http";
import type { Prisma } from "@/generated/prisma/client";

export function cloudinaryConfig() {
  const parsed = z
    .object({
      CLOUDINARY_CLOUD_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/),
      CLOUDINARY_API_KEY: z.string().min(1),
      CLOUDINARY_API_SECRET: z.string().min(1),
    })
    .safeParse(process.env);
  if (!parsed.success)
    throw new SetupError(
      "Images need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Configure them on the server; never use NEXT_PUBLIC keys.",
    );
  return parsed.data;
}
// Signed Upload API: sort non-file parameters, append API secret, hash SHA-256.
async function signedRequest(
  action: "upload" | "destroy",
  params: Record<string, string>,
  cloudName: string,
  file?: Buffer,
) {
  const config = cloudinaryConfig();
  if (cloudName !== config.CLOUDINARY_CLOUD_NAME)
    throw new SetupError(
      "The photo belongs to a different Cloudinary environment. Restore its credentials before cleanup.",
    );
  const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
  const signature = createHash("sha256")
    .update(
      Object.entries(signed)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&") + config.CLOUDINARY_API_SECRET,
    )
    .digest("hex");
  const form = new FormData();
  for (const [key, value] of Object.entries(signed)) form.set(key, value);
  form.set("api_key", config.CLOUDINARY_API_KEY);
  form.set("signature", signature);
  if (file)
    form.set("file", new Blob([new Uint8Array(file)], { type: "image/jpeg" }), "avatar.jpg");
  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new HttpError(
      503,
      "Cloudinary could not be reached. Please try your photo again shortly.",
    );
  }
  if (!response.ok)
    throw new HttpError(
      503,
      "Cloudinary could not process this photo. Check the server's image configuration and account limits.",
    );
  return response.json() as Promise<Record<string, unknown>>;
}
export async function uploadAvatar(userId: string, buffer: Buffer) {
  return uploadManagedImage(userId, buffer, "avatars");
}
export async function uploadProviderImage(providerId: string, buffer: Buffer) {
  return uploadManagedImage(`provider:${providerId}`, buffer, "providers");
}
async function uploadManagedImage(userId: string, buffer: Buffer, folder: "avatars" | "providers") {
  const config = cloudinaryConfig();
  const id = randomUUID();
  const publicId = `grantpath/${folder}/${id}`;
  // Register before network I/O so interrupted uploads can be reclaimed later.
  const asset = await db().mediaAsset.create({
    data: {
      id,
      userId,
      publicId,
      cloudName: config.CLOUDINARY_CLOUD_NAME,
      cleanupAfter: new Date(Date.now() + 3_600_000),
    },
  });
  const result = await signedRequest(
    "upload",
    { public_id: publicId, overwrite: "false" },
    asset.cloudName,
    buffer,
  );
  const parsed = z
    .object({
      public_id: z.literal(publicId),
      resource_type: z.literal("image"),
      secure_url: z.url(),
    })
    .safeParse(result);
  if (!parsed.success)
    throw new HttpError(503, "Cloudinary returned an unexpected image response. Please retry.");
  const url = new URL(parsed.data.secure_url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(`/${asset.cloudName}/image/upload/`)
  )
    throw new HttpError(503, "Cloudinary returned an unexpected delivery URL.");
  return { asset, image: url.toString() };
}
export async function queueMediaCleanup(
  tx: Prisma.TransactionClient,
  publicId: string,
  userId: string,
) {
  const asset = await tx.mediaAsset.findFirst({
    where: { publicId, userId, state: { not: "deleted" } },
  });
  if (!asset) return;
  await tx.mediaAsset.update({
    where: { id: asset.id },
    data: { state: "cleanup", cleanupAfter: new Date() },
  });
  return tx.outbox.upsert({
    where: { key: `media-cleanup:${asset.id}` },
    create: {
      key: `media-cleanup:${asset.id}`,
      topic: "account.media-cleanup",
      payload: { assetId: asset.id },
    },
    update: {},
  });
}
export async function cleanMedia(assetId: string) {
  const asset = await db().mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.state === "deleted") return;
  const active = await db().user.findFirst({
    where: { imagePublicId: asset.publicId },
    select: { id: true },
  });
  const provider = await db().provider.findFirst({
    where: { imagePublicId: asset.publicId },
    select: { id: true },
  });
  if (active || provider) return;
  // Only delete IDs minted and persisted by our server, never arbitrary user URLs.
  if (!/^grantpath\/(avatars|providers)\/[a-f0-9-]{36}$/.test(asset.publicId))
    throw new Error("Photo cleanup needs operator review.");
  const result = await signedRequest(
    "destroy",
    { public_id: asset.publicId, invalidate: "true" },
    asset.cloudName,
  );
  if (!["ok", "not found"].includes(String(result.result)))
    throw new Error("Cloudinary has not confirmed photo deletion.");
  await db().mediaAsset.deleteMany({ where: { id: asset.id } });
}
