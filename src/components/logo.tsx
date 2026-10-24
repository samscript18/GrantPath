import Link from "next/link";
import { Sprout } from "lucide-react";
export function Logo({ light = false }: { light?: boolean }) { return <Link href="/" aria-label="GrantPath home" className={`inline-flex items-center gap-2.5 ${light ? "text-[#f5f2e7]" : "text-primary"}`}><span className={`flex size-8 items-center justify-center rounded-full border ${light ? "border-white/30" : "border-primary/30"}`}><Sprout size={19} strokeWidth={1.5} /></span><span className="font-serif text-[23px] tracking-[-1px]">GrantPath<span className="text-accent">.</span></span></Link>; }
