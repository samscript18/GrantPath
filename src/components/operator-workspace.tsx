"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Image as ImageIcon,
  Inbox,
  ListChecks,
  Radio,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const sections = [
  { id: "discovery", label: "Discovery", description: "Directories & publications", icon: Compass },
  { id: "catalogue", label: "Catalogue", description: "Records & provider images", icon: BookOpen },
  {
    id: "sources",
    label: "Source registry",
    description: "Monitoring & check history",
    icon: Radio,
  },
  {
    id: "reviews",
    label: "Change reviews",
    description: "Compare official evidence",
    icon: ListChecks,
  },
  {
    id: "operations",
    label: "Application jobs",
    description: "Queue & verification tools",
    icon: Workflow,
  },
  { id: "deliveries", label: "Diagnostics", description: "Delivery, events & audit", icon: Inbox },
] as const;
type Section = (typeof sections)[number]["id"];
function sectionForHash(hash: string): Section | undefined {
  const id = hash.replace(/^#/, "");
  if (["discovery-exceptions", "automatic-publications"].includes(id)) return "discovery";
  if (id === "provider-images") return "catalogue";
  return sections.find((section) => section.id === id)?.id;
}

export function OperatorWorkspace({
  panels,
  initialSection = "discovery",
  counts,
}: {
  panels: Record<Section, ReactNode>;
  initialSection?: Section;
  counts: Partial<Record<Section, number>>;
}) {
  const hash = useSyncExternalStore(
    (notify) => {
      window.addEventListener("hashchange", notify);
      return () => window.removeEventListener("hashchange", notify);
    },
    () => window.location.hash,
    () => "",
  );
  const search = useSearchParams();
  // The router retains query parameters across mutations, refreshes and
  // viewport changes; fragments alone are not durable router state.
  const active =
    sectionForHash(`#${search.get("section") || ""}`) ?? sectionForHash(hash) ?? initialSection;
  const sectionLink = (id: Section) => {
    const query = new URLSearchParams(search.toString());
    query.set("section", id);
    return `?${query}#${id}`;
  };
  useEffect(() => {
    const target = document.getElementById(hash.slice(1));
    if (target && sectionForHash(hash) === active) {
      if (target instanceof HTMLDetailsElement) target.open = true;
      target.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [active, hash]);
  return (
    <div
      className="studio-layout"
      onClick={(event) => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
        if (!link) return;
        const target = document.getElementById(link.hash.slice(1));
        if (target instanceof HTMLDetailsElement) target.open = true;
      }}
    >
      <aside className="studio-rail">
        <div className="studio-rail-label">
          <ShieldCheck size={14} /> WORKSPACE
        </div>
        <nav aria-label="Operator sections" className="studio-menu">
          {sections.map(({ id, label, description, icon: Icon }) => (
            <a
              key={id}
              href={sectionLink(id)}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                window.history.pushState(null, "", sectionLink(id));
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }}
              aria-current={active === id ? "location" : undefined}
              aria-controls={`studio-panel-${id}`}
            >
              <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="studio-menu-description">{description}</span>
              </span>
              {counts[id] !== undefined && <span className="studio-menu-count">{counts[id]}</span>}
            </a>
          ))}
        </nav>
        <div className="studio-rail-note">
          <span className="mb-3 inline-flex rounded-lg bg-secondary p-2 text-leaf">
            <ImageIcon size={17} aria-hidden="true" />
          </span>
          <p className="font-serif text-lg">Evidence comes first.</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Publish what the source supports. Keep uncertainty visible.
          </p>
          <Link
            href="/scholarships"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold"
          >
            View public catalogue <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="studio-content">
        {sections.map(({ id, label }) => (
          <div
            key={id}
            id={`studio-panel-${id}`}
            role="region"
            hidden={active !== id}
            aria-label={label}
            className="studio-panel"
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
