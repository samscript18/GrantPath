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
  Coins,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { fundingLabels } from "@/server/scholarships/schema";
import { evidenceHealth } from "@/server/evidence";
import type { CatalogueRow } from "@/server/scholarships";
import { formatDate } from "@/lib/utils";
export function ScholarshipCard({ row, action }: { row: CatalogueRow; action?: ReactNode }) {
  const health = evidenceHealth(row.data);
  const href = `/scholarships/${row.slug}`;
  return (
    <article className="scholarship-row opportunity-entry group border-b border-border py-7 last:border-b-0 sm:py-8">
      <div className="opportunity-identity flex items-center gap-3.5">
        <ProviderImage provider={row.programme.provider} className="size-14 text-4xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-5 text-foreground">
            {row.programme.provider.name}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">Application cycle · {row.cycle}</p>
        </div>
        {action}
      </div>
      <div className="opportunity-layout mt-5">
        <div className="min-w-0">
          <Link href={href} className="group/title block">
            <h2 className="font-serif text-[26px] leading-[1.2] tracking-tight transition-colors group-hover/title:text-leaf sm:text-[29px]">
              {row.title}
            </h2>
          </Link>
          <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} aria-hidden="true" />
              {row.destination}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap size={14} aria-hidden="true" />
              {row.data.levels
                .map((level) =>
                  level === "master"
                    ? "Master’s"
                    : level === "bachelor"
                      ? "Undergraduate"
                      : "Doctorate",
                )
                .join(" · ")}
            </span>
          </div>
          <p className="mt-4 line-clamp-3 text-[13px] leading-7 text-muted-foreground">
            {row.data.summary}
          </p>
        </div>
        <div className="opportunity-facts min-w-0">
          <div>
            <p className="opportunity-fact-label">
              <Coins size={12} aria-hidden="true" />
              FUNDING
            </p>
            <p className="mt-2 text-xs font-semibold leading-6">
              {fundingLabels[row.data.fundingType]}
            </p>
          </div>
          <div>
            <p className="opportunity-fact-label">
              <CalendarDays size={12} aria-hidden="true" />
              CLOSING DATE
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {row.data.deadline
                ? formatDate(row.data.deadline)
                : row.data.deadlineLabel || "Deadline to confirm"}
            </p>
          </div>
          <Badge
            tone={
              row.currentAvailability === "open"
                ? "green"
                : row.currentAvailability === "upcoming"
                  ? "amber"
                  : "neutral"
            }
            className="w-fit"
          >
            {row.currentAvailability === "unknown"
              ? "Availability to confirm"
              : row.currentAvailability === "open"
                ? "Applications open"
                : row.currentAvailability === "closed"
                  ? "Applications closed"
                  : "Upcoming cycle"}
          </Badge>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/80 pt-4">
        <span className="flex items-center gap-1.5 text-[10px] leading-5 text-muted-foreground">
          {health.conflicting || health.stale ? (
            <CircleHelp size={13} className="shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 size={13} className="shrink-0 text-leaf" aria-hidden="true" />
          )}
          {health.conflicting
            ? "Conflicting source wording"
            : health.stale
              ? "Evidence needs a fresh check"
              : `Official evidence checked ${formatDate(health.lastVerified)}`}
        </span>
        <Link
          href={`${href}#requirements`}
          className="opportunity-open inline-flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-secondary"
        >
          View opportunity <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
