"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play } from "lucide-react";

let transientPaused = false;
const motionEvent = "grantpath-motion-change";
function subscribeMotion(notify: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener(motionEvent, notify);
  window.addEventListener("storage", notify);
  media.addEventListener("change", notify);
  return () => {
    window.removeEventListener(motionEvent, notify);
    window.removeEventListener("storage", notify);
    media.removeEventListener("change", notify);
  };
}
function motionSnapshot() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
  try {
    return localStorage.getItem("grantpath-motion") === "paused" ? "paused" : "active";
  } catch {
    return transientPaused ? "paused" : "active";
  }
}

/** Progressive motion: content is readable even when scripting or animation is unavailable. */
export function MotionExperience() {
  const pathname = usePathname();
  const preference = useSyncExternalStore(subscribeMotion, motionSnapshot, () => "active");
  const paused = preference !== "active";
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "active";
  }, [paused]);
  useEffect(() => {
    const animations = new Set<Animation>();
    const observed = new WeakSet<Element>();
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (paused || media.matches) continue;
          const animation = entry.target.animate(
            [
              { opacity: 0.15, transform: "translateY(22px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 650, easing: "cubic-bezier(.2,.75,.25,1)", fill: "none" },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.08 },
    );
    const observe = () => {
      document
        .querySelectorAll(
          "main > section, .page-heading, .workspace-content .paper, .scholarship-row, .application-card, .reference-entry, [data-reveal]",
        )
        .forEach((node) => {
          if (observed.has(node) || node.closest("[data-motion-static], .hero-portal")) return;
          observed.add(node);
          observer.observe(node);
        });
    };
    observe();
    // Server refreshes and client navigation can add cards after the first paint.
    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(observe);
    });
    mutations.observe(document.querySelector("main") || document.body, {
      childList: true,
      subtree: true,
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [pathname, paused]);
  function toggle() {
    const next = !paused;
    transientPaused = next;
    document.documentElement.dataset.motion = next ? "paused" : "active";
    try {
      localStorage.setItem("grantpath-motion", next ? "paused" : "active");
    } catch {
      /* Storage is optional. */
    }
    window.dispatchEvent(new Event(motionEvent));
  }
  return (
    <button
      type="button"
      className="motion-control"
      onClick={toggle}
      disabled={preference === "reduced"}
      aria-pressed={paused}
      aria-label={
        preference === "reduced"
          ? "Reduced motion follows your device settings"
          : paused
            ? "Enable site animations"
            : "Pause site animations"
      }
      title={
        preference === "reduced"
          ? "Reduced motion follows your device settings"
          : paused
            ? "Enable animations"
            : "Pause animations"
      }
    >
      {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
      <span>{paused ? "Motion off" : "Motion on"}</span>
    </button>
  );
}
