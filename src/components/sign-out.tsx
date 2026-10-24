"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span>
      <button
        title="Sign out"
        aria-label="Sign out"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) setError("Couldn’t sign out. Please retry.");
            else {
              router.replace("/login");
              router.refresh();
            }
          } catch {
            setError("Couldn’t sign out. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut size={16} />
      </button>
      {error && (
        <span role="alert" className="mt-2 block text-[10px]">
          {error}
        </span>
      )}
    </span>
  );
}
