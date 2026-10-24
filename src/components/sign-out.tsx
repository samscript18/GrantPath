"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
export function SignOut() {
  const router = useRouter();
  return (
    <button
      title="Sign out"
      aria-label="Sign out"
      onClick={async () => {
        const result = await authClient.signOut();
        if (!result.error) router.push("/login");
      }}
    >
      <LogOut size={16} />
    </button>
  );
}
