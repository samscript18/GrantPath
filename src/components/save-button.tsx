"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check } from "lucide-react";
import { Button } from "./ui/button";
export function SaveButton({ scholarshipId, saved: initial }: { scholarshipId: string; saved: boolean }) {
  const [saved, setSaved] = useState(initial); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  return <div><Button variant="outline" className="w-full" disabled={busy} onClick={async () => { setBusy(true); setMessage(""); try { const response = await fetch("/api/applications", { method: saved ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saved ? { action: "unsave", scholarshipId } : { scholarshipId }) }); const result = await response.json(); if (!response.ok) setMessage(result.message); else { setSaved(!saved); setMessage(saved ? "Unsaved. Your application notes and progress are kept in My applications." : "Saved to your opportunities. Your plan starts here."); router.refresh(); } } catch { setMessage("Unable to save this time. Please retry."); } finally { setBusy(false); } }}>{saved ? <Check size={15} /> : <Bookmark size={15} />}{busy ? "Saving…" : saved ? "Saved · click to unsave" : "Save opportunity"}</Button>{message && <p role="status" className="mt-3 text-[11px] leading-5">{message}</p>}</div>;
}
