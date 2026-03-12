"use client";
import { useEffect, useRef, useCallback } from "react";

// 5 vertical strips — staggered curtain wipe
// Phase 1 (cover):  strips slide DOWN into view, staggered left→right
// Phase 2 (reveal): strips slide UP out of view, staggered left→right
// Total duration: ~900ms cover + 200ms hold + ~900ms reveal = ~2s

const STRIP_COUNT = 5;
const STAGGER_MS = 60; // delay between each strip
const SLIDE_DURATION_MS = 650;
const HOLD_MS = 180;

// GitFinder palette per strip — dark center, accent edges
const STRIP_COLORS = [
  "#0d1117", // dark navy
  "#111827", // slightly lighter
  "#38bdf8",  // cyan accent — center strip pops
  "#111827",
  "#0d1117",
];

interface PageTransitionProps {
  trigger: number; // increment this to fire the transition
  onMidpoint?: () => void; // called at peak cover (swap content here)
}

export default function PageTransition({ trigger, onMidpoint }: PageTransitionProps) {
  const stripsRef = useRef<(HTMLDivElement | null)[]>([]);
  const midpointFiredRef = useRef(false);
  const animatingRef = useRef(false);

  const runTransition = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    midpointFiredRef.current = false;

    const strips = stripsRef.current.filter(Boolean) as HTMLDivElement[];

    // Reset all strips: positioned at top, height 0 (hidden above)
    strips.forEach(s => {
      s.style.transition = "none";
      s.style.top = "0";
      s.style.height = "0%";
      s.style.transform = "scaleY(0)";
      s.style.transformOrigin = "top center";
    });

    // Force reflow
    strips[0]?.getBoundingClientRect();

    // ── PHASE 1: Cover — strips grow downward (scaleY 0→1), staggered
    strips.forEach((s, i) => {
      const delay = i * STAGGER_MS;
      setTimeout(() => {
        s.style.transition = `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`;
        s.style.transform = "scaleY(1)";
        s.style.height = "100%";
      }, delay);
    });

    // Midpoint: all strips covering — swap content
    const midpoint = STRIP_COUNT * STAGGER_MS + SLIDE_DURATION_MS + HOLD_MS;
    setTimeout(() => {
      if (!midpointFiredRef.current) {
        midpointFiredRef.current = true;
        onMidpoint?.();
      }
    }, midpoint);

    // ── PHASE 2: Reveal — strips shrink upward (transformOrigin bottom, scaleY 1→0)
    strips.forEach((s, i) => {
      const delay = midpoint + i * STAGGER_MS;
      setTimeout(() => {
        s.style.transformOrigin = "bottom center";
        s.style.transition = `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`;
        s.style.transform = "scaleY(0)";
      }, delay);
    });

    // Done
    const totalDuration = midpoint + STRIP_COUNT * STAGGER_MS + SLIDE_DURATION_MS + 100;
    setTimeout(() => {
      animatingRef.current = false;
      strips.forEach(s => {
        s.style.transition = "none";
        s.style.transform = "scaleY(0)";
        s.style.height = "0%";
      });
    }, totalDuration);
  }, [onMidpoint]);

  // Fire on mount (initial load)
  useEffect(() => {
    const timer = setTimeout(runTransition, 80);
    return () => clearTimeout(timer);
  }, []);

  // Fire on trigger change (tab switches)
  const prevTrigger = useRef(0);
  useEffect(() => {
    if (trigger === 0) return; // skip mount trigger (handled above)
    if (trigger !== prevTrigger.current) {
      prevTrigger.current = trigger;
      runTransition();
    }
  }, [trigger, runTransition]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
      }}
    >
      {Array.from({ length: STRIP_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => { stripsRef.current[i] = el; }}
          style={{
            flex: 1,
            height: "0%",
            transform: "scaleY(0)",
            transformOrigin: "top center",
            background: STRIP_COLORS[i],
            // subtle border between strips for depth
            borderRight: i < STRIP_COUNT - 1 ? "1px solid rgba(56,189,248,0.08)" : "none",
          }}
        />
      ))}
    </div>
  );
}
