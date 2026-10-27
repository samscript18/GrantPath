"use client";

import Image from "next/image";
import { useState } from "react";

function imageSource(image?: string | null) {
  if (!image || image.length > 90_000) return undefined;
  if (/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return image;
  try {
    const url = new URL(image);
    if (["https:", "http:"].includes(url.protocol)) return url.href;
  } catch {
    /* Fall back to initials for unsupported sources. */
  }
  return undefined;
}

export function Avatar({
  name,
  image,
  className = "",
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = imageSource(image);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toUpperCase() || "GP";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-secondary font-serif text-primary ${className}`}
    >
      {source && source !== failedSource ? (
        <Image
          unoptimized
          src={source}
          alt={`${name}’s profile photo`}
          width={256}
          height={256}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span aria-label={`${name}’s initials`}>{initials}</span>
      )}
    </span>
  );
}
