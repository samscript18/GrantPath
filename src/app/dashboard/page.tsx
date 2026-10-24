import Link from "next/link";
import { requireUser } from "@/server/accounts/session";
import { getProfile } from "@/server/profiles";
import { Shell } from "@/components/shell";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
export default async function Dashboard() { const actor = await requireUser(); const profile = await getProfile(actor); return <Shell actor={actor} active="/dashboard"><PageHeading eyebrow="YOUR NEXT CHAPTER" title={`A little closer, ${actor.name.split(" ")[0]}.`} description="Your scholarship journey, with a clearer sense of direction." /><section className="bg-primary p-8 text-white"><p className="eyebrow text-white/60">A STRONGER START</p><h2 className="editorial mt-4 text-4xl">Make your opportunities personal.</h2><p className="mt-4 mb-6 max-w-lg text-sm leading-7 text-white/70">{profile.version ? `Your profile is saved at version ${profile.version}. Keep it up to date to make your matches more useful.` : "Tell us a little about yourself. We’ll help you understand the requirements that matter to your plans."}</p><Button asChild variant="secondary"><Link href="/profile">{profile.version ? "Update your profile" : "Build your profile"} ↗</Link></Button></section></Shell>; }
