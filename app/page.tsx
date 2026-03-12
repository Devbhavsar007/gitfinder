"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Repo, DATE_FILTERS, QUALITY_LEVELS, LANGS, TRENDING_CATEGORIES,
  searchRepos, fetchTrending, scoreRepo, qualityLabel, buildSearchQuery, getDateVal,
} from "@/lib/github";
import RepoCard from "@/components/RepoCard";
import DetailModal from "@/components/DetailModal";
import ReadmeModal from "@/components/ReadmeModal";
import PageTransition from "@/components/PageTransition";
import MouseTrail from "@/components/MouseTrail";
import CommitTicker from "@/components/CommitTicker";

type Tab = "search" | "trending";

export default function Home() {
  const [tab, setTab] = useState<Tab>("search");
  const [transitionTrigger, setTransitionTrigger] = useState(0);
  const pendingTabRef = useRef<Tab | null>(null);

  // Tab switch — fire transition, swap tab at midpoint
  const switchTab = (next: Tab) => {
    if (next === tab) return;
    pendingTabRef.current = next;
    setTransitionTrigger(t => t + 1);
  };

  const handleMidpoint = () => {
    if (pendingTabRef.current) {
      setTab(pendingTabRef.current);
      pendingTabRef.current = null;
    }
  };

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Repo[]>([]);
  const [filtered, setFiltered] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFilter, setDateFilter] = useState(DATE_FILTERS[0]);
  const [qualityFilter, setQualityFilter] = useState("all");
  const [langFilter, setLangFilter] = useState("Any");
  const [showDateDrop, setShowDateDrop] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  // Trending state
  const [trendCat, setTrendCat] = useState(TRENDING_CATEGORIES[0]);
  const [trendResults, setTrendResults] = useState<Record<string, Repo[]>>({});
  const [trendLoading, setTrendLoading] = useState(false);

  // Modal state
  const [selected, setSelected] = useState<Repo | null>(null);
  const [readmeRepo, setReadmeRepo] = useState<Repo | null>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (qualityFilter === "all") { setFiltered(results); return; }
    setFiltered(results.filter(r => qualityLabel(scoreRepo(r)) === qualityFilter));
  }, [qualityFilter, results]);

  const doSearch = useCallback(async (p = 1) => {
    if (!query.trim()) return;
    setLoading(true); setError("");
    try {
      const q = buildSearchQuery(query, dateFilter, langFilter);
      const data = await searchRepos(q, p);
      if (data.error) throw new Error(data.error);
      setResults(data.items || []);
      setTotal(data.total_count || 0);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  }, [query, dateFilter, langFilter]);

  const loadTrending = async (cat: typeof TRENDING_CATEGORIES[0]) => {
    setTrendCat(cat);
    if (trendResults[cat.label]) return;
    setTrendLoading(true);
    try {
      const items = await fetchTrending(cat.query);
      setTrendResults(prev => ({ ...prev, [cat.label]: items }));
    } finally { setTrendLoading(false); }
  };

  useEffect(() => { loadTrending(TRENDING_CATEGORIES[0]); }, []);

  const totalPages = Math.min(Math.ceil(total / 15), 66);
  const EXAMPLES = ["weather app", "markdown editor", "discord bot", "auth boilerplate", "file uploader", "rest api"];

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px" }}>
      {/* Nav */}
      <nav data-no-trail="" className="flex items-center gap-3 py-5" style={{ borderBottom: "1px solid var(--bd)", marginBottom: 4 }}>
        <span className="text-xl font-black tracking-tight" style={{
          background: "linear-gradient(135deg,#38bdf8,#818cf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>
          {"<GitFinder/>"}
        </span>
        <div className="flex gap-1 ml-auto p-1 rounded-xl" style={{ background: "var(--s2)", border: "1px solid var(--bd)" }}>
          {(["search", "trending"] as Tab[]).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={tab === t ? { background: "#38bdf8", color: "#000" } : { color: "var(--mt2)" }}>
              {t === "search" ? "🔍 Search" : "📈 Trending"}
            </button>
          ))}
        </div>
      </nav>

      {/* ── SEARCH TAB ── */}
      {tab === "search" && (
        <>
          <div className="text-center py-14 pb-8">
            <p className="mono text-xs tracking-widest uppercase mb-4" style={{ color: "var(--mt2)" }}>GitHub Project Explorer</p>
            <h1 className="font-black tracking-tight mb-3" style={{ fontSize: "clamp(32px,6vw,58px)", lineHeight: 1.08, letterSpacing: -2 }}>
              Find any project.<br />
              <span style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                In seconds.
              </span>
            </h1>
            <p className="text-sm mx-auto" style={{ color: "var(--mt2)", maxWidth: 460, lineHeight: 1.7 }}>
              Type a 1–3 word idea. We query GitHub, read READMEs, score quality, and surface the best matches.
            </p>
          </div>

          {/* Search bar */}
          <div data-no-trail="" className="flex gap-2.5 mx-auto mb-4" style={{ maxWidth: 680 }}>
            <div className="relative flex-1 flex items-center">
              <span className="absolute left-4 pointer-events-none" style={{ color: "var(--mt)" }}>
                <SearchIcon />
              </span>
              <input
                className="w-full py-3.5 pr-10 text-sm rounded-xl outline-none transition-all"
                style={{
                  paddingLeft: 44, background: "var(--s2)", border: "1.5px solid var(--bd)",
                  color: "var(--tx)", fontFamily: "'Bricolage Grotesque', sans-serif"
                }}
                onFocus={e => (e.target.style.borderColor = "#38bdf8")}
                onBlur={e => (e.target.style.borderColor = "var(--bd)")}
                placeholder="weather app · discord bot · rest api boilerplate..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch(1)}
              />
              {query && (
                <button className="absolute right-3 text-xs" style={{ color: "var(--mt)" }}
                  onClick={() => { setQuery(""); setResults([]); setFiltered([]); setTotal(0); }}>✕</button>
              )}
            </div>
            <button onClick={() => doSearch(1)} disabled={loading || !query.trim()}
              className="px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity"
              style={{ background: "#38bdf8", color: "#000", opacity: (loading || !query.trim()) ? 0.4 : 1 }}>
              {loading ? <><div className="spin w-4 h-4" /> Searching</> : "Search →"}
            </button>
          </div>

          {/* Filters */}
          <div data-no-trail="" className="flex items-center gap-2 flex-wrap justify-center mb-8" style={{ maxWidth: 780, margin: "0 auto 32px" }}>
            {/* Date */}
            <div className="relative" ref={dateRef}>
              <button onClick={() => setShowDateDrop(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                style={{ border: `1.5px solid ${dateFilter.value ? "#38bdf855" : "var(--bd)"}`, background: "var(--s2)", color: dateFilter.value ? "#38bdf8" : "var(--mt2)" }}>
                📅 {dateFilter.label} ▾
              </button>
              {showDateDrop && (
                <div className="absolute top-full mt-2 left-0 z-20 rounded-xl p-1.5 flex flex-col gap-0.5 min-w-40"
                  style={{ background: "var(--s2)", border: "1px solid var(--bd)", boxShadow: "0 20px 40px #00000077" }}>
                  {DATE_FILTERS.map(f => (
                    <button key={f.label} onClick={() => { setDateFilter(f); setShowDateDrop(false); }}
                      className="px-3 py-2 rounded-lg text-xs text-left transition-all"
                      style={{ color: dateFilter.label === f.label ? "#38bdf8" : "var(--mt2)", background: dateFilter.label === f.label ? "var(--s3)" : "none", fontWeight: dateFilter.label === f.label ? 700 : 400 }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality */}
            {QUALITY_LEVELS.map(ql => (
              <button key={ql.value} onClick={() => setQualityFilter(ql.value)} title={ql.desc}
                className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                style={qualityFilter === ql.value
                  ? { borderColor: ql.color, color: ql.color, background: ql.color + "15", border: "1.5px solid" }
                  : { border: "1.5px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}>
                {ql.label}
              </button>
            ))}

            {/* Language */}
            <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
              className="px-3.5 py-2 rounded-full text-xs font-semibold outline-none"
              style={{ border: "1.5px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}>
              {LANGS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm mono" style={{ background: "#f851491a", border: "1px solid #f8514933", color: "#f87171" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Result meta */}
          {total > 0 && !loading && (
            <div className="flex items-center gap-2 flex-wrap mb-5 text-sm mono" style={{ color: "var(--mt2)" }}>
              <span style={{ color: "var(--tx)", fontWeight: 600 }}>{total.toLocaleString("en-US")} repos</span>
              <span style={{ color: "var(--bd)" }}>·</span>
              <span>"{query}"</span>
              {dateFilter.value && <><span style={{ color: "var(--bd)" }}>·</span><span>🗓 {dateFilter.label}</span></>}
              {qualityFilter !== "all" && (
                <><span style={{ color: "var(--bd)" }}>·</span>
                  <span style={{ color: QUALITY_LEVELS.find(q => q.value === qualityFilter)?.color }}>● {qualityFilter}</span></>
              )}
              <span style={{ color: "var(--bd)" }}>·</span>
              <span style={{ color: "var(--tx)", fontWeight: 600 }}>{filtered.length} shown</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <div className="spin w-10 h-10 mx-auto mb-4" />
              <p className="text-sm mb-1.5" style={{ color: "var(--mt2)" }}>Scanning GitHub...</p>
              <p className="text-xs mono" style={{ color: "var(--mt)" }}>Fetching metadata · Scoring quality · Ranking</p>
            </div>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && (
            <>
              <div data-no-trail="" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
                {filtered.map((r, i) => (
                  <RepoCard key={r.id} repo={r} idx={i} onSelect={(repo) => setSelected(repo)} />
                ))}
              </div>

              {/* Pagination */}
              <div data-no-trail="" className="flex items-center gap-2 justify-center mt-8 flex-wrap">
                <button onClick={() => doSearch(page - 1)} disabled={page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: page === 1 ? "var(--mt)" : "var(--mt2)", opacity: page === 1 ? 0.35 : 1 }}>
                  ← Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const nums = [1, Math.max(1, page - 1), page, Math.min(totalPages, page + 1), totalPages]
                      .filter((v, j, a) => v > 0 && v <= totalPages && a.indexOf(v) === j).sort((a, b) => a - b);
                    const p = nums[i];
                    if (!p) return null;
                    return (
                      <button key={p} onClick={() => doSearch(p)}
                        className="w-9 h-9 rounded-xl text-sm mono transition-all"
                        style={p === page
                          ? { background: "#38bdf8", color: "#000", fontWeight: 700, border: "1px solid #38bdf8" }
                          : { background: "var(--s2)", border: "1px solid var(--bd)", color: "var(--mt2)" }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => doSearch(page + 1)} disabled={page >= totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: page >= totalPages ? "var(--mt)" : "var(--mt2)", opacity: page >= totalPages ? 0.35 : 1 }}>
                  Next →
                </button>
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && !error && results.length === 0 && (
            <div data-no-trail="" className="text-center py-20">
              <div className="text-5xl mb-4">🔭</div>
              <h2 className="text-xl font-bold mb-2">Search GitHub's 300M+ repositories</h2>
              <p className="text-sm mb-6" style={{ color: "var(--mt2)" }}>Type any concept — we do the heavy lifting</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => { setQuery(ex); setTimeout(() => doSearch(1), 50); }}
                    className="px-4 py-2 rounded-full text-sm transition-all"
                    style={{ border: "1px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.borderColor = "#38bdf844"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--mt2)"; e.currentTarget.style.borderColor = "var(--bd)"; }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && results.length > 0 && filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-xl font-bold mb-2">No {qualityFilter} repos in these results</h2>
              <p className="text-sm" style={{ color: "var(--mt2)" }}>Try "All" quality or a different date range</p>
            </div>
          )}
        </>
      )}

      {/* ── TRENDING TAB ── */}
      {tab === "trending" && (
        <>
          <div className="py-10 pb-6 text-center">
            <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--mt2)" }}>What developers are building</p>
            <h1 className="text-4xl font-black tracking-tight">📈 Trending Now</h1>
          </div>

          {/* Category pills */}
          <div data-no-trail="" className="flex flex-wrap gap-2 justify-center mb-8">
            {TRENDING_CATEGORIES.map(cat => (
              <button key={cat.label} onClick={() => loadTrending(cat)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={trendCat.label === cat.label
                  ? { background: "#38bdf8", color: "#000", border: "1.5px solid #38bdf8" }
                  : { border: "1.5px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">{trendCat.icon}</span>
            <div>
              <h2 className="text-xl font-bold">{trendCat.label}</h2>
              <p className="text-xs mono" style={{ color: "var(--mt2)" }}>Top repos created in the last 30 days</p>
            </div>
          </div>

          {trendLoading ? (
            <div className="text-center py-16">
              <div className="spin w-10 h-10 mx-auto mb-3" />
              <p className="text-sm" style={{ color: "var(--mt2)" }}>Loading trending repos...</p>
            </div>
          ) : (
            <div data-no-trail="" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
              {(trendResults[trendCat.label] || []).map((r, i) => (
                <RepoCard key={r.id} repo={r} idx={i} onSelect={(repo) => setSelected(repo)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {selected && (
        <DetailModal repo={selected} onClose={() => setSelected(null)}
          onReadme={r => { setReadmeRepo(r); setSelected(null); }} />
      )}
      {readmeRepo && <ReadmeModal repo={readmeRepo} onClose={() => setReadmeRepo(null)} />}

      {/* Page transition curtain */}
      <PageTransition trigger={transitionTrigger} onMidpoint={handleMidpoint} />

      {/* Mouse trail */}
      <MouseTrail disabled={!!(selected || readmeRepo)} />

      {/* Scrolling commit log ticker */}
      <CommitTicker />
    </main>
  );
}

function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
