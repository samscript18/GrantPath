"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function AccountNameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [previousName, setPreviousName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      id="edit-profile"
      className="scroll-mt-40"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, previousName }),
          });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.message);
            return;
          }
          setName(result.name);
          setPreviousName(result.name);
          setMessage("Your name is saved.");
          router.refresh();
        } catch {
          setMessage("We couldn’t save your name. Your edit is still here; please retry.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field-label" htmlFor="account-name">
        Display name
      </label>
      <div className="flex flex-wrap gap-3 sm:flex-nowrap">
        <Input
          id="account-name"
          name="name"
          autoComplete="name"
          value={name}
          maxLength={100}
          required
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={busy || !name.trim() || name.trim() === previousName}>
          <Check size={14} />
          {busy ? "Saving…" : "Save name"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
        The name you see throughout your GrantPath workspace.
      </p>
      {message && (
        <p role="status" className="mt-3 text-xs leading-6">
          {message}
        </p>
      )}
    </form>
  );
}
