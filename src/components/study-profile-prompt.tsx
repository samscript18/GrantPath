"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, X, ShieldCheck } from "lucide-react";
import type { StudentProfile } from "@/server/profiles/schema";
import { profileReadiness } from "@/server/profiles/readiness";
import { ProfileForm } from "./profile-form";
import { Button } from "./ui/button";

type ProfileProgress = { data: StudentProfile; version: number; stage: number };
export function StudyProfilePrompt({
  sessionId,
  initial,
  institutions,
}: {
  sessionId: string;
  initial: ProfileProgress;
  institutions: string[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState(initial);
  const router = useRouter();
  const storageKey = `grantpath:study-profile-prompt:${sessionId}`;
  const readiness = profileReadiness(saved.data);
  const firstStage =
    readiness.missing.find((field) => field.stage < initial.stage)?.stage ?? initial.stage;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    try {
      if (sessionStorage.getItem(storageKey) === "dismissed") return;
    } catch {
      /* The dialog still works when browser storage is blocked. */
    }
    if (!dialog.open) dialog.showModal();
    titleRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restore = () => {
      document.body.style.overflow = previousOverflow;
    };
    dialog.addEventListener("close", restore);
    return () => {
      dialog.removeEventListener("close", restore);
      dialog.close();
      restore();
    };
  }, [storageKey]);
  function dismiss() {
    try {
      sessionStorage.setItem(storageKey, "dismissed");
    } catch {
      /* In-memory closing still works for this mounted session. */
    }
    dialogRef.current?.close();
  }
  return (
    <dialog
      ref={dialogRef}
      className="study-profile-dialog"
      aria-labelledby="study-profile-dialog-title"
      aria-describedby="study-profile-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <div className="flex max-h-[92svh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-secondary/30 px-5 py-5 sm:px-8 sm:py-6">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-2 text-[9px] text-leaf">
              <GraduationCap size={15} strokeWidth={1.5} aria-hidden="true" />
              YOUR STUDY PROFILE
            </p>
            <h2
              ref={titleRef}
              tabIndex={-1}
              id="study-profile-dialog-title"
              className="editorial mt-3 text-[28px] leading-tight outline-none sm:text-4xl"
            >
              A clearer path starts with you.
            </h2>
            <p
              id="study-profile-dialog-description"
              className="mt-3 max-w-2xl text-xs leading-6 text-muted-foreground"
            >
              Tell us about your education and what comes next. We’ll use your saved answers to
              explain relevant scholarship matches, including anything that still needs
              confirmation.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-2 shrink-0"
            aria-label="Continue study profile later"
            onClick={dismiss}
          >
            <X size={19} strokeWidth={1.5} />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-[10px] text-muted-foreground">
            <span>
              {readiness.fields.filter((field) => field.complete).length} of{" "}
              {readiness.fields.length} matching basics saved
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} aria-hidden="true" />
              Private to your account
            </span>
          </div>
          <ProfileForm
            variant="modal"
            initial={initial.data}
            version={initial.version}
            stage={firstStage}
            institutions={institutions}
            onSaved={setSaved}
            onComplete={() => {
              dismiss();
              router.push("/dashboard");
              router.refresh();
            }}
          />
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-paper px-5 py-4 sm:px-8">
          <p className="max-w-lg text-[10px] leading-5 text-muted-foreground">
            Each step saves when you continue. Unsaved answers on this step won’t be kept if you
            close. You can return from Profile.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={dismiss}>
            Continue later
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
