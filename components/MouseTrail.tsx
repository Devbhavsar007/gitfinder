"use client";
import { useEffect, useRef } from "react";

// Each "stamp" spawns at cursor position — tilted, scaled in, then fades
// Like polaroids being tossed on a table — the fiddle.digital contact page mechanic

const TRAIL_CARDS = [
  { name: "linux/kernel",          stars: "171k", lang: "C",          color: "#555555", commit: "fix: memory leak in kthread",        pct: "99.1%" },
  { name: "microsoft/vscode",      stars: "163k", lang: "TypeScript", color: "#2b7489", commit: "feat: inline diff decorations",      pct: "98.7%" },
  { name: "facebook/react",        stars: "226k", lang: "JavaScript", color: "#f1e05a", commit: "chore: bump scheduler version",      pct: "97.4%" },
  { name: "rust-lang/rust",        stars: "97k",  lang: "Rust",       color: "#dea584", commit: "stabilize: async_fn_in_trait",       pct: "96.2%" },
  { name: "golang/go",             stars: "123k", lang: "Go",         color: "#00ADD8", commit: "runtime: improve GC pacer",          pct: "98.0%" },
  { name: "vercel/next.js",        stars: "124k", lang: "TypeScript", color: "#2b7489", commit: "feat: partial prerendering ga",      pct: "97.8%" },
  { name: "torvalds/git",          stars: "52k",  lang: "C",          color: "#555555", commit: "refs: packed-refs optimization",     pct: "99.3%" },
  { name: "openai/whisper",        stars: "73k",  lang: "Python",     color: "#3572A5", commit: "add: multilingual timestamps",       pct: "95.6%" },
  { name: "neovim/neovim",         stars: "82k",  lang: "C",          color: "#555555", commit: "lsp: improve hover handler",         pct: "98.5%" },
  { name: "denoland/deno",         stars: "93k",  lang: "Rust",       color: "#dea584", commit: "fix: Worker terminate race",         pct: "97.1%" },
  { name: "tensorflow/tensorflow", stars: "185k", lang: "Python",     color: "#3572A5", commit: "perf: XLA cache invalidation",       pct: "96.8%" },
  { name: "vuejs/core",            stars: "47k",  lang: "TypeScript", color: "#2b7489", commit: "feat: useTemplateRef stable",        pct: "98.2%" },
  { name: "sveltejs/svelte",       stars: "79k",  lang: "TypeScript", color: "#2b7489", commit: "chore: migrate to svelte 5",        pct: "97.9%" },
  { name: "astro-build/astro",     stars: "46k",  lang: "TypeScript", color: "#2b7489", commit: "fix: hydration mismatch ssr",       pct: "96.5%" },
  { name: "supabase/supabase",     stars: "71k",  lang: "TypeScript", color: "#2b7489", commit: "feat: realtime presence v2",        pct: "#95.3%" },
];

// Pool of git-flavored status badges shown on each card
const BADGES = ["main", "HEAD", "v2.0.0", "feat/*", "release", "hotfix", "develop", "origin"];

const SPAWN_DIST   = 90;   // px between spawns — bigger = sparser
const LIFE_MS      = 1800; // how long each card lives before fully gone
const FADE_START   = 0.55; // life fraction at which fade begins
const MAX_CARDS    = 14;   // DOM pool size — reused
const TILT_MAX     = 18;   // max rotation degrees

export default function MouseTrail({ disabled = false }: { disabled?: boolean }) {
  const spotRef      = useRef<HTMLDivElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);
  const disabledRef  = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    const spot = spotRef.current;
    const wrap = wrapRef.current;
    if (!wrap) return;

    // ── DOM card pool (we reuse nodes to avoid GC churn)
    type CardState = {
      el:       HTMLDivElement;
      x:        number;
      y:        number;
      tilt:     number;
      born:     number;
      life:     number; // 0-1
      active:   boolean;
      dataIdx:  number;
    };

    const pool: CardState[] = Array.from({ length: MAX_CARDS }, (_, i) => {
      const el = document.createElement("div");
      el.style.cssText = [
        "position:absolute",
        "width:188px",
        "background:#0a0d14",
        "border:1px solid rgba(56,189,248,0.25)",
        "border-radius:11px",
        "padding:12px 14px",
        "opacity:0",
        "pointer-events:none",
        "font-family:'DM Mono',monospace",
        "will-change:transform,opacity",
        "transform:translate(-50%,-50%) scale(0.6) rotate(0deg)",
        "box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 0 0 rgba(56,189,248,0)",
      ].join(";");
      wrap.appendChild(el);
      return { el, x: -999, y: -999, tilt: 0, born: 0, life: 0, active: false, dataIdx: i % TRAIL_CARDS.length };
    });

    let poolHead  = 0; // round-robin index
    let dataHead  = 0; // which card data to use next

    const renderCard = (state: CardState) => {
      const d     = TRAIL_CARDS[state.dataIdx];
      const badge = BADGES[state.dataIdx % BADGES.length];
      const hash  = (state.born >>> 0).toString(16).slice(-7).padStart(7, "0");

      state.el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:5px;min-width:0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" style="flex-shrink:0">
              <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
              <path d="M6 9v2c0 1.7 1.3 3 3 3h6c1.7 0 3-1.3 3-3V9"/>
              <line x1="12" y1="15" x2="12" y2="12"/>
            </svg>
            <span style="font-size:10.5px;color:#38bdf8;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${d.name}</span>
          </div>
          <span style="font-size:9px;color:#1a2a1a;background:#0d2d0d;border:1px solid #1a4d1a;border-radius:4px;padding:1px 5px;color:#4ade80;flex-shrink:0">${badge}</span>
        </div>

        <div style="font-size:9px;color:#38bdf822;background:#38bdf808;border-radius:4px;padding:3px 6px;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;border:1px solid #38bdf812">
          ▸ ${d.commit}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
          <span style="display:flex;align-items:center;gap:4px;font-size:9px;color:#8892a4">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${d.color}"></span>
            ${d.lang}
          </span>
          <span style="font-size:9px;color:#8892a4">
            <span style="color:#f59e0b">★</span> ${d.stars}
          </span>
        </div>

        <div style="height:1px;background:linear-gradient(90deg,rgba(56,189,248,0.15),transparent);margin-bottom:7px"></div>

        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:8.5px;color:#3d4a60;font-family:'DM Mono',monospace">${hash}</span>
          <div style="display:flex;align-items:center;gap:3px">
            <span style="width:5px;height:5px;border-radius:50%;background:#4ade80;display:inline-block;box-shadow:0 0 4px #4ade80"></span>
            <span style="font-size:8.5px;color:#4ade8088">${d.pct} pass</span>
          </div>
        </div>
      `;
    };

    const spawn = (x: number, y: number) => {
      const state   = pool[poolHead % MAX_CARDS];
      poolHead++;
      state.x       = x;
      state.y       = y;
      state.tilt    = (Math.random() - 0.5) * TILT_MAX * 2;
      state.born    = performance.now();
      state.life    = 1;
      state.active  = true;
      state.dataIdx = dataHead % TRAIL_CARDS.length;
      dataHead++;
      renderCard(state);
      // immediate position + entrance scale
      state.el.style.left      = `${x}px`;
      state.el.style.top       = `${y}px`;
      state.el.style.transform = `translate(-50%,-50%) scale(0.55) rotate(${state.tilt}deg)`;
      state.el.style.opacity   = "0";
    };

    // ── mouse tracking
    const mouse     = { x: -999, y: -999 };
    const lastSpawn = { x: -999, y: -999 };
    let   hasMoused = false;
    let   paused    = disabled;

    // We mark zones with data-no-trail.
    // Use mouseover/mouseout (not mouseenter/mouseleave) so moving between
    // children of the same zone never briefly un-pauses (no gap flicker).
    const isInNoTrailZone = (el: Element | null): boolean => {
      if (!el) return false;
      return !!el.closest("[data-no-trail]");
    };

    const onOver = (e: MouseEvent) => {
      if (isInNoTrailZone(e.target as Element)) paused = true;
    };
    const onOut = (e: MouseEvent) => {
      // Only unpause if the element we're moving INTO is also not in a zone
      const to = e.relatedTarget as Element | null;
      if (!isInNoTrailZone(to)) paused = false;
    };

    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout",  onOut,  { passive: true });

    const onMove = (e: MouseEvent) => {
      mouse.x   = e.clientX;
      mouse.y   = e.clientY;
      hasMoused = true;

      // spotlight
      if (spot) {
        spot.style.background =
          `radial-gradient(700px circle at ${e.clientX}px ${e.clientY}px,` +
          `rgba(56,189,248,0.09) 0%,` +
          `rgba(129,140,248,0.05) 30%,` +
          `rgba(56,189,248,0.01) 60%,` +
          `transparent 75%)`;
      }

      // spawn on distance threshold — only when not over content
      const dx = e.clientX - lastSpawn.x;
      const dy = e.clientY - lastSpawn.y;
      if (!paused && !disabledRef.current && Math.hypot(dx, dy) >= SPAWN_DIST) {
        lastSpawn.x = e.clientX;
        lastSpawn.y = e.clientY;
        spawn(e.clientX, e.clientY);
      }
    };

    // ── RAF — animate life cycle of each card
    let raf = 0;
    const tick = (now: number) => {
      for (const state of pool) {
        if (!state.active) continue;
        const age      = now - state.born;
        const progress = Math.min(age / LIFE_MS, 1); // 0→1 over lifetime

        // entrance: scale 0.55→1.0 in first 20% of life
        const enterT = Math.min(progress / 0.20, 1);
        const scaleV = 0.55 + enterT * 0.45;

        // slight float upward — y drifts -20px over lifetime
        const floatY = -20 * progress;

        // opacity: fade in fast, hold, fade out after FADE_START
        let opacity: number;
        if (progress < 0.12) {
          opacity = progress / 0.12;
        } else if (progress < FADE_START) {
          opacity = 1;
        } else {
          opacity = 1 - (progress - FADE_START) / (1 - FADE_START);
        }

        // tilt eases toward 0 after entrance (settles like a card being placed)
        const tiltSettle = state.tilt * (1 - Math.min(progress / 0.35, 1) * 0.6);

        state.el.style.opacity   = String(Math.max(0, opacity));
        state.el.style.left      = `${state.x}px`;
        state.el.style.top       = `${state.y + floatY}px`;
        state.el.style.transform =
          `translate(-50%,-50%) scale(${scaleV}) rotate(${tiltSettle}deg)`;

        // glow pulse on entrance
        const glowAlpha = Math.max(0, 0.3 * (1 - enterT));
        state.el.style.boxShadow =
          `0 8px 32px rgba(0,0,0,0.8),0 0 ${20 + glowAlpha * 30}px rgba(56,189,248,${glowAlpha})`;

        if (progress >= 1) {
          state.active         = false;
          state.el.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout",  onOut);
      cancelAnimationFrame(raf);
      pool.forEach(s => s.el.remove());
    };
  }, []);

  return (
    <>
      <div ref={spotRef} style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        transition: "background 0.08s linear",
      }} />
      <div ref={wrapRef} style={{
        position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none", overflow: "hidden",
      }} />
    </>
  );
}
