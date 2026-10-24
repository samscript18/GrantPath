import { ProviderImage } from "./provider-image";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  GraduationCap,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { fundingLabels } from "@/server/scholarships/schema";
import { evidenceHealth } from "@/server/evidence";
import type { CatalogueRow } from "@/server/scholarships";
import { formatDate } from "@/lib/utils";
export function ScholarshipCard({ row, action }: { row: CatalogueRow; action?: ReactNode }) {
  const health = evidenceHealth(row.data);
  return (
    <article className="scholarship-row group border-b border-border py-6 last:border-b-0 sm:py-7">
      <div className="scholarship-identity flex items-center gap-3">
        <ProviderImage provider={row.programme.provider} className="size-13 text-4xl" />
        <p className="mr-auto text-[10px] font-semibold tracking-[.08em] text-muted-foreground uppercase">
          {row.programme.provider.name}
        </p>
        <Badge
          className="scholarship-window"
          tone={
            row.currentAvailability === "open"
              ? "green"
              : row.currentAvailability === "upcoming"
                ? "amber"
                : "neutral"
          }
        >
          {row.currentAvailability === "unknown"
            ? "Availability to confirm"
            : row.currentAvailability === "open"
              ? "Applications open"
              : row.currentAvailability === "closed"
                ? "Applications closed"
                : "Upcoming cycle"}
        </Badge>
        {action}
      </div>
      <Link
        href={`/scholarships/${row.slug}`}
        className="mt-5 flex items-start justify-between gap-5"
      >
        <h2 className="font-serif text-[25px] leading-[1.2] tracking-tight transition-colors group-hover:text-leaf sm:text-[28px]">
          {row.title}
        </h2>
        <span className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:bg-secondary sm:flex">
          <ArrowUpRight size={15} aria-hidden="true" />
        </span>
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} aria-hidden="true" />
          {row.destination}
        </span>
        <span className="flex items-center gap-1.5">
          <GraduationCap size={14} aria-hidden="true" />
          {row.data.levels
            .map((l) =>
              l === "master" ? "Master’s" : l === "bachelor" ? "Undergraduate" : "Doctorate",
            )
            .join(" · ")}
        </span>
        <span>{row.cycle}</span>
      </div>
      <p className="mt-4 line-clamp-3 max-w-2xl text-[13px] leading-7 text-muted-foreground sm:line-clamp-none">
        {row.data.summary}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/55 px-3.5 py-3">
        <span className="text-[11px] font-medium text-foreground">
          {fundingLabels[row.data.fundingType]}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CalendarDays size={13} aria-hidden="true" />
          {row.data.deadline
            ? formatDate(row.data.deadline)
            : row.data.deadlineLabel || "Deadline to confirm"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[10px] leading-5 text-muted-foreground">
          {health.conflicting || health.stale ? (
            <CircleHelp size={12} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={12} aria-hidden="true" />
          )}
          {health.conflicting
            ? "Conflicting source wording"
            : health.stale
              ? "Evidence needs a fresh check"
              : `Official evidence checked ${formatDate(health.lastVerified)}`}
        </span>
        <Link
          href={`/scholarships/${row.slug}#requirements`}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary"
        >
          Requirements & evidence <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
