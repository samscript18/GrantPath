"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { Avatar } from "./avatar";
import { Button } from "./ui/button";

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose a photo smaller than 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Your browser couldn’t prepare this photo. Please try another browser.");
    context.fillStyle = "#f8f7f2";
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(bitmap.width, bitmap.height);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}

export function ProfilePhotoEditor({
  name,
  initialImage,
  initialVersion,
}: {
  name: string;
  initialImage: string | null;
  initialVersion: string;
}) {
  const [image, setImage] = useState(initialImage);
  const [version, setVersion] = useState(initialVersion);
  const [pending, setPending] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "preparing" | "saving">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  async function save(next: string | null) {
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/account/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: next, previousVersion: version }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message);
        return;
      }
      setImage(result.image);
      setVersion(result.version);
      setPending(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      setMessage(
        next
          ? "Your profile photo is saved."
          : "Your photo was removed. Your initials will appear instead.",
      );
      router.refresh();
    } catch {
      setMessage("We couldn’t update your photo. Please retry.");
    } finally {
      setStatus("idle");
    }
  }
  return (
    <section aria-labelledby="photo-heading" className="paper p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <Camera size={17} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <p className="eyebrow text-[9px] text-muted-foreground">PROFILE PHOTO</p>
      </div>
      <h2 id="photo-heading" className="mt-5 font-serif text-2xl tracking-tight">
        Make it feel like you.
      </h2>
      <p className="mt-3 text-xs leading-7 text-muted-foreground">
        Your photo appears in your account and workspace navigation. Images are stored on
        Cloudinary; your study profile stays private.
      </p>
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-muted/35 p-4">
        <Avatar name={name} image={pending || image} className="size-14 rounded-lg text-xl" />
        <div className="min-w-0">
          <p className="text-xs font-semibold">
            {pending ? "New photo preview" : image ? "Current account photo" : "Your initials"}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {pending ? "Save to use this photo." : "Recognisable, wherever you pick up your plans."}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        id="profile-photo-file"
        type="file"
        tabIndex={-1}
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={status !== "idle"}
        aria-label="Choose a profile photo"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          setStatus("preparing");
          setMessage("");
          setPending(null);
          setFileName("");
          try {
            setPending(await preparePhoto(file));
            setFileName(file.name);
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "This photo could not be opened. Choose another image.",
            );
            if (inputRef.current) inputRef.current.value = "";
          } finally {
            setStatus("idle");
          }
        }}
      />
      <button
        type="button"
        className="mt-4 flex w-full flex-col items-center rounded-xl border border-dashed border-primary/25 bg-secondary/25 px-5 py-7 text-center transition-colors hover:border-primary/50 hover:bg-secondary/45 disabled:cursor-wait disabled:opacity-60"
        disabled={status !== "idle"}
        onClick={() => inputRef.current?.click()}
      >
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border bg-paper">
          <ImagePlus size={19} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <span className="max-w-full break-all text-xs font-semibold">
          {status === "preparing" ? "Preparing your photo…" : pending ? fileName : "Choose a photo"}
        </span>
        <span className="mt-2 text-[10px] leading-5 text-muted-foreground">
          JPEG, PNG or WebP · Up to 5 MB
          <br />
          Cropped to a square and resized before saving.
        </span>
      </button>
      <Button
        type="button"
        className="mt-4 w-full"
        disabled={!pending || status !== "idle"}
        onClick={() => save(pending)}
      >
        <Upload size={14} />
        {status === "saving" ? "Saving…" : "Update profile photo"}
      </Button>
      {(pending || image) && (
        <div className="mt-3 flex flex-wrap justify-center gap-4">
          {pending && (
            <button
              type="button"
              disabled={status !== "idle"}
              className="inline-flex items-center gap-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setPending(null);
                setFileName("");
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X size={12} />
              Discard selection
            </button>
          )}
          {image && (
            <button
              type="button"
              disabled={status !== "idle"}
              className="py-1 text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => save(null)}
            >
              Remove current photo
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-xs leading-6">
          {message}
        </p>
      )}
    </section>
  );
}
