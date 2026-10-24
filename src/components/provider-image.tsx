"use client";
import Image from "next/image";
import { useState } from "react";
export type ProviderIdentity = { name: string; imageUrl?: string | null; imageAlt?: string | null };
export function ProviderImage({
  provider,
  className = "",
  decorative = true,
}: {
  provider: ProviderIdentity;
  className?: string;
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const source = provider.imageUrl?.startsWith("https://") ? provider.imageUrl : undefined;
  const initials = provider.name
    .replace(/^University of /, "")
    .split(/[\s·]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`provider-image relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-paper font-serif text-primary ${className}`}
      aria-hidden={decorative || undefined}
    >
      {source && source !== failed ? (
        <Image
          unoptimized
          src={source}
          width={512}
          height={512}
          alt={decorative ? "" : provider.imageAlt || provider.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-contain p-1.5"
          onError={() => setFailed(source)}
        />
      ) : (
        <span className="font-serif text-[.42em] tracking-tight">{initials}</span>
      )}
    </span>
  );
}
