"use client";
export async function prepareProviderImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a JPEG, PNG or WebP smaller than 5 MB.");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.fillStyle = "#fffefa";
    context.fillRect(0, 0, 512, 512);
    const scale = Math.min(480 / image.width, 480 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= 87_000) return data;
    }
    throw new Error("This image is too detailed. Choose a simpler logo or smaller image.");
  } finally {
    image.close();
  }
}
