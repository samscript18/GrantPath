"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImagePlus } from "lucide-react";
import { ProviderImage } from "./provider-image";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { accountRequest, accountError } from "./account-api";
import { prepareProviderImage } from "@/lib/prepare-provider-image";
export function ProviderImageEditor({
  provider,
}: {
  provider: {
    id: string;
    name: string;
    url: string;
    imageUrl: string | null;
    imageAlt: string | null;
    imageSourceUrl: string | null;
    version: string;
  };
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(provider.imageUrl);
  const [version, setVersion] = useState(provider.version);
  const [sourceUrl, setSource] = useState(provider.imageSourceUrl || provider.url);
  const [alt, setAlt] = useState(provider.imageAlt || `${provider.name} logo`);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  async function save(image: string | null) {
    setBusy(true);
    setMessage("");
    try {
      const result = await accountRequest<{ imageUrl: string | null; version: string }>(
        "/api/operator/provider-image",
        "PUT",
        {
          providerId: provider.id,
          previousVersion: version,
          image,
          ...(image ? { sourceUrl, alt } : {}),
        },
      );
      setImageUrl(result.imageUrl);
      setVersion(result.version);
      setPending(null);
      if (input.current) input.current.value = "";
      setMessage(
        image
          ? "Image saved across this provider’s opportunities."
          : "Image removed. Provider initials will appear instead.",
      );
      router.refresh();
    } catch (e) {
      setMessage(accountError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="grid items-start gap-5 border-b border-border py-6 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) void save(pending);
      }}
    >
      <div className="flex items-center gap-4">
        <ProviderImage
          provider={{ name: provider.name, imageUrl: pending ? undefined : imageUrl }}
          className="size-16 text-4xl"
        />
        <div>
          <h3 className="text-sm font-semibold">{provider.name}</h3>
          <p className="mt-2 break-all text-[10px] leading-5 text-muted-foreground">
            {provider.url}
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {pending && (
          <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-paper">
            <ProviderImage
              provider={{ name: provider.name, imageUrl: null }}
              className="size-full text-4xl"
            />
            <span
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${pending})` }}
              role="img"
              aria-label="Selected provider image preview"
            />
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-label={`Choose image for ${provider.name}`}
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage("");
            try {
              setPending(await prepareProviderImage(file));
            } catch (e) {
              setMessage(accountError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        <div>
          <label className="field-label" htmlFor={`image-source-${provider.id}`}>
            Official image source page
          </label>
          <Input
            id={`image-source-${provider.id}`}
            type="url"
            value={sourceUrl}
            onChange={(e) => setSource(e.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`image-alt-${provider.id}`}>
            Image description
          </label>
          <Input
            id={`image-alt-${provider.id}`}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={180}
            required
            disabled={busy}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            <ImagePlus size={14} />
            Choose image
          </Button>
          <Button type="submit" size="sm" disabled={busy || !pending}>
            <Upload size={14} />
            {busy ? "Please wait…" : "Save image"}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void save(null)}
              disabled={busy}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-[10px] leading-5 text-muted-foreground">
          JPEG, PNG or WebP · Up to 5 MB. Logos keep their proportions. Saving updates the provider
          identity across all cycles.
        </p>
        {message && (
          <p role="status" className="text-xs leading-6">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
