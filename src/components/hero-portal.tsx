"use client";

import { useRef } from "react";
import { ArrowUpRight, Compass, GraduationCap, Sparkles } from "lucide-react";

/** Decorative ambition atlas; labels describe product features, never live counts or outcomes. */
export function HeroPortal() {
  const scene = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  return (
    <div
      ref={scene}
      className="hero-portal"
      aria-hidden="true"
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.dataset.motion === "paused"
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          scene.current?.style.setProperty("--portal-x", `${x * 10}deg`);
          scene.current?.style.setProperty("--portal-y", `${-y * 10}deg`);
        });
      }}
      onPointerLeave={() => {
        cancelAnimationFrame(frame.current);
        scene.current?.style.setProperty("--portal-x", "0deg");
        scene.current?.style.setProperty("--portal-y", "0deg");
      }}
    >
      <div className="portal-aura" />
      <div className="portal-coordinate coordinate-top">YOUR AMBITION · NO BORDERS</div>
      <div className="portal-coordinate coordinate-bottom">A NEW DIRECTION STARTS WITH YOU</div>
      <div className="portal-system">
        <div className="portal-orbit orbit-one">
          <span />
        </div>
        <div className="portal-orbit orbit-two">
          <span />
        </div>
        <div className="portal-orbit orbit-three" />
        <div className="portal-arch">
          <div className="portal-stars">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="portal-sun">
            <Sparkles size={30} strokeWidth={1} />
          </div>
          <svg className="portal-landscape" viewBox="0 0 300 440" fill="none">
            <path d="M0 270C80 180 170 230 300 150V440H0Z" fill="#9aac80" />
            <path d="M0 335C100 200 210 355 300 240V440H0Z" fill="#617a4c" />
            <path d="M0 370C130 310 175 415 300 300V440H0Z" fill="#244b36" />
            <path
              className="portal-road"
              d="M145 445C230 375 50 355 160 308C260 265 155 248 202 217"
              stroke="#f3ecd1"
              strokeWidth="13"
              strokeLinecap="round"
            />
            <path
              className="portal-trail"
              d="M145 445C230 375 50 355 160 308C260 265 155 248 202 217"
              stroke="#d4a64e"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div className="portal-doorline" />
        </div>
        <div className="portal-ticket ticket-discover">
          <span className="ticket-icon">
            <Compass size={19} />
          </span>
          <span>
            <small>01 · DISCOVER</small>
            <strong>Find your direction</strong>
          </span>
          <ArrowUpRight size={15} />
        </div>
        <div className="portal-ticket ticket-match">
          <span className="ticket-icon">
            <GraduationCap size={19} />
          </span>
          <span>
            <small>02 · UNDERSTAND</small>
            <strong>See where you stand</strong>
          </span>
        </div>
        <div className="portal-seal">
          <Sparkles size={18} />
          <span>
            BIG
            <br />
            POSSIBILITIES
          </span>
        </div>
        <span className="portal-cross cross-one">+</span>
        <span className="portal-cross cross-two">+</span>
      </div>
    </div>
  );
}
