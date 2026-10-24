"use client";

import { useEffect, useRef, useState } from "react";

const sections = [
  ["overview", "Overview"],
  ["requirements", "Requirements"],
  ["evidence", "Official evidence"],
  ["history", "Change history"],
] as const;

export function OpportunitySections() {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>("overview");

  useEffect(() => {
    const nav = navRef.current;
    const targets = sections
      .map(([id]) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!nav || !targets.length) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      // Match the anchor offset, which includes both sticky navigation bars.
      const activationLine = parseFloat(getComputedStyle(targets[0]).scrollMarginTop) + 2;
      let current = targets[0].id;
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= activationLine) current = target.id;
      }
      const last = targets[targets.length - 1];
      // A short final section may never reach the sticky bar before the page ends.
      if (
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 &&
        last.getBoundingClientRect().top < window.innerHeight
      )
        current = last.id;
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    const observer = new ResizeObserver(schedule);
    if (nav.parentElement) observer.observe(nav.parentElement);
    const header = document.querySelector(".workspace-header");
    if (header) observer.observe(header);
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLAnchorElement>(`a[href="#${activeId}"]`);
    if (!nav || !link) return;
    const container = nav.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    if (item.left < container.left + 8 || item.right > container.right - 8) {
      // Reveal the active mobile tab without moving the page vertically.
      nav.scrollTo({
        left: nav.scrollLeft + item.left - container.left - (nav.clientWidth - item.width) / 2,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }, [activeId]);

  return (
    <nav
      ref={navRef}
      aria-label="Opportunity sections"
      className="scholarship-section-nav section-navigation sticky z-10 mb-7 flex gap-1 overflow-x-auto rounded-lg border border-border bg-paper p-1 text-xs"
    >
      {sections.map(([id, label]) => (
        <a key={id} href={`#${id}`} aria-current={activeId === id ? "location" : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}
