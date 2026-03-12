"use client";
import { useEffect, useRef } from "react";

const COMMITS = [
  "feat: add search result caching layer",
  "fix: readme parser handles empty repos",
  "chore: bump next.js to 14.2.5",
  "refactor: extract quality scoring to lib",
  "feat: trending categories with 30d filter",
  "fix: pagination edge case on page 66",
  "perf: memoize scoreRepo calculations",
  "feat: live site detection in repo cards",
  "chore: update tsconfig strict mode",
  "fix: date filter range for 2021–2024",
  "feat: page transition curtain animation",
  "refactor: ghFetch proxy → server route",
  "fix: readme base64 decode on edge runtime",
  "feat: quality breakdown signals panel",
  "chore: add .env.example for contributors",
  "fix: modal close on overlay click",
  "perf: lazy load trending on tab focus",
  "feat: clone command copy to clipboard",
  "fix: lang color fallback for unknown langs",
  "docs: add deploy to vercel instructions",
];

const AUTHORS = [
  "torvalds", "gaearon", "yyx990803", "sindresorhus",
  "tj", "addyosmani", "jaredpalmer", "rauchg",
  "nicolo-ribaudo", "antfu",
];

const HASH = () => Math.floor(Math.random() * 0xffffff).toString(16).padStart(7, "0");

export default function CommitTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Build items twice for seamless loop
    const items = [...COMMITS, ...COMMITS].map((msg, i) => {
      const author = AUTHORS[i % AUTHORS.length];
      const hash = HASH();
      return `<span class="ct-item">
        <span class="ct-hash">${hash}</span>
        <span class="ct-author">@${author}</span>
        <span class="ct-msg">${msg}</span>
      </span><span class="ct-sep">·</span>`;
    });
    track.innerHTML = items.join("");

    // Measure and animate
    const totalW = track.scrollWidth / 2;
    let x = 0;
    let raf: number;

    const tick = () => {
      x -= 0.6;
      if (x <= -totalW) x = 0;
      track.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9996,
      height: 32,
      overflow: "hidden",
      background: "linear-gradient(180deg, transparent 0%, rgba(7,8,12,0.95) 40%)",
      borderTop: "1px solid rgba(56,189,248,0.08)",
      display: "flex",
      alignItems: "center",
    }}>
      <style>{`
        .ct-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          padding: 0 10px;
        }
        .ct-hash { color: #38bdf8; opacity: 0.7; }
        .ct-author { color: #818cf8; }
        .ct-msg { color: #5a6480; }
        .ct-sep { color: #1e2333; font-size: 10px; }
      `}</style>
      <div ref={trackRef} suppressHydrationWarning style={{ display: "flex", alignItems: "center", willChange: "transform" }} />
    </div>
  );
}
