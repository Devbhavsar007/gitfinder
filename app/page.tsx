"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Repo, DeveloperSpotlight,
  DATE_FILTERS, QUALITY_LEVELS, LANGS, TRENDING_CATEGORIES,
  TIME_RANGES, SORT_OPTIONS,
  searchRepos, fetchTrending, fetchDeveloperSpotlight,
  scoreRepo, qualityLabel, buildSearchQuery, getDateVal,
  fmtNum, relativeTime,
} from "@/lib/github";
import RepoCard from "@/components/RepoCard";
import DetailModal from "@/components/DetailModal";
import ReadmeModal from "@/components/ReadmeModal";
import PageTransition from "@/components/PageTransition";
import MouseTrail from "@/components/MouseTrail";
import CommitTicker from "@/components/CommitTicker";

type Tab = "search" | "trending";
type TrendingView = "repos" | "developers";

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
  const [showLangDrop, setShowLangDrop] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // ── Enhanced Trending State ──
  const [trendCat, setTrendCat] = useState(TRENDING_CATEGORIES[0]);
  const [trendTimeRange, setTrendTimeRange] = useState(TIME_RANGES[1]); // "This Week"
  const [trendSort, setTrendSort] = useState(SORT_OPTIONS[0]); // "Stars"
  const [trendLang, setTrendLang] = useState("Any");
  const [trendResults, setTrendResults] = useState<Repo[]>([]);
  const [trendTotal, setTrendTotal] = useState(0);
  const [trendPage, setTrendPage] = useState(1);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendView, setTrendView] = useState<TrendingView>("repos");
  const [showTrendLangDrop, setShowTrendLangDrop] = useState(false);
  const [showTrendSortDrop, setShowTrendSortDrop] = useState(false);
  const trendLangRef = useRef<HTMLDivElement>(null);
  const trendSortRef = useRef<HTMLDivElement>(null);

  // Developer spotlight
  const [developers, setDevelopers] = useState<DeveloperSpotlight[]>([]);
  const [devLoading, setDevLoading] = useState(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<Repo[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Modal state
  const [selected, setSelected] = useState<Repo | null>(null);
  const [readmeRepo, setReadmeRepo] = useState<Repo | null>(null);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gitfinder_bookmarks");
      if (saved) setBookmarks(JSON.parse(saved));
    } catch { /* noop */ }
  }, []);

  const toggleBookmark = (repo: Repo) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.id === repo.id);
      const next = exists ? prev.filter(b => b.id !== repo.id) : [...prev, repo];
      localStorage.setItem("gitfinder_bookmarks", JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (repo: Repo) => bookmarks.some(b => b.id === repo.id);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDrop(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangDrop(false);
      if (trendLangRef.current && !trendLangRef.current.contains(e.target as Node)) setShowTrendLangDrop(false);
      if (trendSortRef.current && !trendSortRef.current.contains(e.target as Node)) setShowTrendSortDrop(false);
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

  // ── Enhanced Trending Loader ──
  const loadTrending = useCallback(async (opts?: {
    cat?: typeof TRENDING_CATEGORIES[0];
    time?: typeof TIME_RANGES[0];
    sort?: typeof SORT_OPTIONS[0];
    lang?: string;
    p?: number;
    append?: boolean;
  }) => {
    const cat = opts?.cat || trendCat;
    const time = opts?.time || trendTimeRange;
    const sort = opts?.sort || trendSort;
    const lang = opts?.lang ?? trendLang;
    const p = opts?.p || 1;
    const append = opts?.append || false;

    if (!append) setTrendLoading(true);

    try {
      const data = await fetchTrending({
        category: cat.query,
        days: time.days,
        sort: sort.value,
        lang,
        perPage: 30,
        page: p,
      });

      if (append) {
        setTrendResults(prev => [...prev, ...(data.items || [])]);
      } else {
        setTrendResults(data.items || []);
      }
      setTrendTotal(data.total_count || 0);
      setTrendPage(p);
    } finally {
      setTrendLoading(false);
    }
  }, [trendCat, trendTimeRange, trendSort, trendLang]);

  const loadDevelopers = useCallback(async (lang?: string, days?: number) => {
    setDevLoading(true);
    try {
      const devs = await fetchDeveloperSpotlight({
        lang: lang ?? trendLang,
        days: days ?? trendTimeRange.days,
      });
      setDevelopers(devs);
    } finally { setDevLoading(false); }
  }, [trendLang, trendTimeRange]);

  // Initial load on mount
  useEffect(() => {
    loadTrending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCatChange = (cat: typeof TRENDING_CATEGORIES[0]) => {
    setTrendCat(cat);
    if (trendView === "repos") {
      loadTrending({ cat });
    }
  };

  const handleTimeChange = (time: typeof TIME_RANGES[0]) => {
    setTrendTimeRange(time);
    if (trendView === "repos") {
      loadTrending({ time });
    } else {
      loadDevelopers(undefined, time.days);
    }
  };

  const handleSortChange = (sort: typeof SORT_OPTIONS[0]) => {
    setTrendSort(sort);
    setShowTrendSortDrop(false);
    loadTrending({ sort });
  };

  const handleTrendLangChange = (lang: string) => {
    setTrendLang(lang);
    setShowTrendLangDrop(false);
    if (trendView === "repos") {
      loadTrending({ lang });
    } else {
      loadDevelopers(lang);
    }
  };

  const handleViewChange = (view: TrendingView) => {
    setTrendView(view);
    if (view === "developers" && developers.length === 0) {
      loadDevelopers();
    }
  };

  const loadMore = () => {
    loadTrending({ p: trendPage + 1, append: true });
  };

  // Trending stats
  const totalStars = trendResults.reduce((s, r) => s + r.stargazers_count, 0);
  const totalForks = trendResults.reduce((s, r) => s + r.forks_count, 0);
  const topLangs = Object.entries(
    trendResults.reduce<Record<string, number>>((acc, r) => {
      if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

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

        {/* Bookmarks button */}
        <button
          onClick={() => setShowBookmarks(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ml-2"
          style={{
            background: bookmarks.length > 0 ? "#f59e0b12" : "var(--s2)",
            border: `1px solid ${bookmarks.length > 0 ? "#f59e0b44" : "var(--bd)"}`,
            color: bookmarks.length > 0 ? "#f59e0b" : "var(--mt2)",
          }}
        >
          🔖 {bookmarks.length}
        </button>

        <div className="flex gap-1 ml-auto p-1 rounded-xl" style={{ background: "var(--s2)", border: "1px solid var(--bd)" }}>
          {(["search", "trending"] as Tab[]).map(t => (
            <button key={t} onClick={() => switchTab(t)} suppressHydrationWarning
              className="px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={tab === t ? { background: "#38bdf8", color: "#000" } : { color: "var(--mt2)" }}>
              {t === "search" ? "🔍 Search" : "📈 Trending"}
            </button>
          ))}
        </div>
      </nav>

      {/* ── BOOKMARKS DRAWER ── */}
      {showBookmarks && (
        <div className="mb-6 rounded-xl p-5" style={{ background: "var(--s1)", border: "1px solid var(--bd)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2">🔖 Saved Repos <span className="text-xs mono" style={{ color: "var(--mt2)" }}>({bookmarks.length})</span></h3>
            <button onClick={() => setShowBookmarks(false)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "var(--mt2)", background: "var(--s2)", border: "1px solid var(--bd)" }}>Close</button>
          </div>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--mt)" }}>No saved repos yet. Click the bookmark icon on any repo card to save it.</p>
          ) : (
            <div data-no-trail="" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
              {bookmarks.map((r, i) => (
                <RepoCard key={r.id} repo={r} idx={i} onSelect={(repo) => setSelected(repo)} />
              ))}
            </div>
          )}
        </div>
      )}

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
              <input suppressHydrationWarning
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
                <button suppressHydrationWarning className="absolute right-3 text-xs" style={{ color: "var(--mt)" }}
                  onClick={() => { setQuery(""); setResults([]); setFiltered([]); setTotal(0); }}>✕</button>
              )}
            </div>
            <button suppressHydrationWarning onClick={() => doSearch(1)} disabled={loading || !query.trim()}
              className="px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-opacity"
              style={{ background: "#38bdf8", color: "#000", opacity: (loading || !query.trim()) ? 0.4 : 1 }}>
              {loading ? <><div className="spin w-4 h-4" /> Searching</> : "Search →"}
            </button>
          </div>

          {/* Filters */}
          <div data-no-trail="" className="flex items-center gap-2 flex-wrap justify-center mb-8" style={{ maxWidth: 780, margin: "0 auto 32px" }}>
            {/* Date */}
            <div className="relative" ref={dateRef}>
              <button suppressHydrationWarning onClick={() => setShowDateDrop(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                style={{ border: `1.5px solid ${dateFilter.value ? "#38bdf855" : "var(--bd)"}`, background: "var(--s2)", color: dateFilter.value ? "#38bdf8" : "var(--mt2)" }}>
                📅 {dateFilter.label} ▾
              </button>
              {showDateDrop && (
                <div className="dropdown-menu absolute top-full mt-2 left-0 z-20 rounded-xl p-1.5 flex flex-col gap-0.5 min-w-40"
                  style={{ boxShadow: "0 20px 40px #00000077" }}>
                  {DATE_FILTERS.map(f => (
                    <button suppressHydrationWarning key={f.label} onClick={() => { setDateFilter(f); setShowDateDrop(false); }}
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
              <button suppressHydrationWarning key={ql.value} onClick={() => setQualityFilter(ql.value)} title={ql.desc}
                className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                style={qualityFilter === ql.value
                  ? { borderColor: ql.color, color: ql.color, background: ql.color + "15", border: "1.5px solid" }
                  : { border: "1.5px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}>
                {ql.label}
              </button>
            ))}

            {/* Language */}
            <div className="relative" ref={langRef}>
              <button suppressHydrationWarning onClick={() => setShowLangDrop(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                style={{ border: `1.5px solid ${langFilter !== "Any" ? "#38bdf855" : "var(--bd)"}`, background: "var(--s2)", color: langFilter !== "Any" ? "#38bdf8" : "var(--mt2)" }}>
                {langFilter} ▾
              </button>
              {showLangDrop && (
                <div className="dropdown-menu absolute top-full mt-2 right-0 z-20 rounded-xl p-1.5 flex flex-col gap-0.5 min-w-40 max-h-64 overflow-y-auto"
                  style={{ boxShadow: "0 20px 40px #00000077" }}>
                  {LANGS.map(l => (
                    <button suppressHydrationWarning key={l} onClick={() => { setLangFilter(l); setShowLangDrop(false); }}
                      className="px-3 py-2 rounded-lg text-xs text-left transition-all"
                      style={{ color: langFilter === l ? "#38bdf8" : "var(--mt2)", background: langFilter === l ? "var(--s3)" : "none", fontWeight: langFilter === l ? 700 : 400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <span>&quot;{query}&quot;</span>
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
                <button suppressHydrationWarning onClick={() => doSearch(page - 1)} disabled={page === 1}
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
                      <button suppressHydrationWarning key={p} onClick={() => doSearch(p)}
                        className="w-9 h-9 rounded-xl text-sm mono transition-all"
                        style={p === page
                          ? { background: "#38bdf8", color: "#000", fontWeight: 700, border: "1px solid #38bdf8" }
                          : { background: "var(--s2)", border: "1px solid var(--bd)", color: "var(--mt2)" }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button suppressHydrationWarning onClick={() => doSearch(page + 1)} disabled={page >= totalPages}
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
              <h2 className="text-xl font-bold mb-2">Search GitHub&apos;s 300M+ repositories</h2>
              <p className="text-sm mb-6" style={{ color: "var(--mt2)" }}>Type any concept — we do the heavy lifting</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLES.map(ex => (
                  <button suppressHydrationWarning key={ex} onClick={() => { setQuery(ex); setTimeout(() => doSearch(1), 50); }}
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
              <p className="text-sm" style={{ color: "var(--mt2)" }}>Try &quot;All&quot; quality or a different date range</p>
            </div>
          )}
        </>
      )}

      {/* ── TRENDING TAB ── */}
      {tab === "trending" && (
        <>
          {/* Hero Header */}
          <div className="py-10 pb-6 text-center">
            <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--mt2)" }}>Updated daily · What developers are building</p>
            <h1 className="font-black tracking-tight mb-2" style={{ fontSize: "clamp(28px,5vw,48px)", lineHeight: 1.1, letterSpacing: -1.5 }}>
              <span style={{ background: "linear-gradient(135deg,#f59e0b,#f97316,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Trending
              </span>
              {" "}Repositories
            </h1>
            <p className="text-sm mx-auto" style={{ color: "var(--mt2)", maxWidth: 480 }}>
              Discover the hottest open source projects. Filter by category, time range, language, and sort order.
            </p>
          </div>

          {/* ── Stats Bar ── */}
          {!trendLoading && trendResults.length > 0 && (
            <div data-no-trail="" className="trending-stats-bar">
              <div className="trending-stat">
                <span className="trending-stat-value">{fmtNum(trendTotal)}</span>
                <span className="trending-stat-label">Total Repos</span>
              </div>
              <div className="trending-stat-divider" />
              <div className="trending-stat">
                <span className="trending-stat-value">{fmtNum(totalStars)}</span>
                <span className="trending-stat-label">⭐ Combined Stars</span>
              </div>
              <div className="trending-stat-divider" />
              <div className="trending-stat">
                <span className="trending-stat-value">{fmtNum(totalForks)}</span>
                <span className="trending-stat-label">🍴 Combined Forks</span>
              </div>
              <div className="trending-stat-divider" />
              <div className="trending-stat">
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {topLangs.slice(0, 3).map(([lang]) => (
                    <span key={lang} className="text-xs mono" style={{ color: "var(--mt2)" }}>{lang}</span>
                  ))}
                </div>
                <span className="trending-stat-label">Top Languages</span>
              </div>
            </div>
          )}

          {/* ── View Switcher: Repos / Developers ── */}
          <div data-no-trail="" className="flex items-center gap-2 justify-center mb-5">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--s2)", border: "1px solid var(--bd)" }}>
              {(["repos", "developers"] as TrendingView[]).map(v => (
                <button key={v} onClick={() => handleViewChange(v)} suppressHydrationWarning
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
                  style={trendView === v
                    ? { background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000" }
                    : { color: "var(--mt2)" }}>
                  {v === "repos" ? "📦 Repositories" : "👨‍💻 Developers"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Time Range Buttons ── */}
          <div data-no-trail="" className="flex flex-wrap gap-2 justify-center mb-4">
            {TIME_RANGES.map(tr => (
              <button suppressHydrationWarning key={tr.label} onClick={() => handleTimeChange(tr)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={trendTimeRange.label === tr.label
                  ? { background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "1.5px solid #f59e0b" }
                  : { border: "1.5px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}>
                {tr.icon} {tr.label}
              </button>
            ))}
          </div>

          {/* ── Category Pills ── */}
          {trendView === "repos" && (
            <div data-no-trail="" className="flex flex-wrap gap-2 justify-center mb-4">
              {TRENDING_CATEGORIES.map(cat => (
                <button suppressHydrationWarning key={cat.label} onClick={() => handleCatChange(cat)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                  style={trendCat.label === cat.label
                    ? { background: "#38bdf8", color: "#000", border: "1.5px solid #38bdf8" }
                    : { border: "1.5px solid var(--bd)", background: "var(--s2)", color: "var(--mt2)" }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Sort & Language Filters ── */}
          {trendView === "repos" && (
            <div data-no-trail="" className="flex items-center gap-2 flex-wrap justify-center mb-6">
              {/* Sort dropdown */}
              <div className="relative" ref={trendSortRef}>
                <button suppressHydrationWarning onClick={() => setShowTrendSortDrop(v => !v)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{ border: "1.5px solid #818cf844", background: "var(--s2)", color: "#818cf8" }}>
                  {trendSort.icon} Sort: {trendSort.label} ▾
                </button>
                {showTrendSortDrop && (
                  <div className="dropdown-menu absolute top-full mt-2 left-0 z-20 rounded-xl p-1.5 flex flex-col gap-0.5 min-w-40"
                    style={{ boxShadow: "0 20px 40px #00000077" }}>
                    {SORT_OPTIONS.map(s => (
                      <button suppressHydrationWarning key={s.value} onClick={() => handleSortChange(s)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
                        style={{
                          color: trendSort.value === s.value ? "#818cf8" : "var(--mt2)",
                          background: trendSort.value === s.value ? "var(--s3)" : "none",
                          fontWeight: trendSort.value === s.value ? 700 : 400,
                        }}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language dropdown */}
              <div className="relative" ref={trendLangRef}>
                <button suppressHydrationWarning onClick={() => setShowTrendLangDrop(v => !v)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{
                    border: `1.5px solid ${trendLang !== "Any" ? "#4ade8044" : "var(--bd)"}`,
                    background: "var(--s2)",
                    color: trendLang !== "Any" ? "#4ade80" : "var(--mt2)",
                  }}>
                  💻 {trendLang} ▾
                </button>
                {showTrendLangDrop && (
                  <div className="dropdown-menu absolute top-full mt-2 right-0 z-20 rounded-xl p-1.5 flex flex-col gap-0.5 min-w-40 max-h-64 overflow-y-auto"
                    style={{ boxShadow: "0 20px 40px #00000077" }}>
                    {LANGS.map(l => (
                      <button suppressHydrationWarning key={l} onClick={() => handleTrendLangChange(l)}
                        className="px-3 py-2 rounded-lg text-xs text-left transition-all"
                        style={{
                          color: trendLang === l ? "#4ade80" : "var(--mt2)",
                          background: trendLang === l ? "var(--s3)" : "none",
                          fontWeight: trendLang === l ? 700 : 400,
                        }}>
                      {l}
                    </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Active Filters Summary ── */}
          {trendView === "repos" && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="text-3xl">{trendCat.icon}</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{trendCat.label === "All" ? "All Categories" : trendCat.label}</h2>
                <p className="text-xs mono flex items-center gap-2" style={{ color: "var(--mt2)" }}>
                  <span>{trendTimeRange.icon} {trendTimeRange.label}</span>
                  <span style={{ color: "var(--bd)" }}>·</span>
                  <span>Sorted by {trendSort.label}</span>
                  {trendLang !== "Any" && <><span style={{ color: "var(--bd)" }}>·</span><span>💻 {trendLang}</span></>}
                  {trendTotal > 0 && <><span style={{ color: "var(--bd)" }}>·</span><span style={{ color: "var(--tx)" }}>{fmtNum(trendTotal)} found</span></>}
                </p>
              </div>
            </div>
          )}

          {/* ── REPOS VIEW ── */}
          {trendView === "repos" && (
            <>
              {trendLoading ? (
                <div className="text-center py-16">
                  <div className="spin w-10 h-10 mx-auto mb-3" />
                  <p className="text-sm" style={{ color: "var(--mt2)" }}>Loading trending repos...</p>
                </div>
              ) : trendResults.length > 0 ? (
                <>
                  <div data-no-trail="" className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
                    {trendResults.map((r, i) => (
                      <div key={r.id} className="relative group">
                        <RepoCard repo={r} idx={i} onSelect={(repo) => setSelected(repo)} />
                        {/* Rank badge */}
                        {i < 3 && (
                          <div className="trending-rank-badge" data-rank={i + 1}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                          </div>
                        )}
                        {/* Bookmark button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleBookmark(r); }}
                          className="trending-bookmark-btn"
                          title={isBookmarked(r) ? "Remove bookmark" : "Bookmark this repo"}
                          style={{ color: isBookmarked(r) ? "#f59e0b" : "var(--mt)" }}
                        >
                          {isBookmarked(r) ? "★" : "☆"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Load More */}
                  {trendResults.length < trendTotal && (
                    <div className="flex justify-center mt-8">
                      <button
                        suppressHydrationWarning
                        onClick={loadMore}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                        style={{ background: "var(--s2)", border: "1.5px solid var(--bd)", color: "var(--mt2)" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf844"; e.currentTarget.style.color = "#38bdf8"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.color = "var(--mt2)"; }}
                      >
                        Load More ({trendResults.length} of {fmtNum(trendTotal)}) ↓
                      </button>
                    </div>
                  )}

                  {/* ── Language Distribution Bar ── */}
                  {topLangs.length > 0 && (
                    <div className="mt-8 rounded-xl p-5" style={{ background: "var(--s1)", border: "1px solid var(--bd)" }}>
                      <h3 className="text-xs font-bold uppercase tracking-widest mono mb-3" style={{ color: "var(--mt2)" }}>Language Distribution</h3>
                      <div className="flex rounded-full overflow-hidden h-2 mb-3" style={{ background: "var(--bd)" }}>
                        {topLangs.map(([lang, count]) => {
                          const pct = (count / trendResults.length) * 100;
                          const colors: Record<string, string> = {
                            Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#2b7489",
                            Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
                          };
                          return (
                            <div
                              key={lang}
                              title={`${lang}: ${count} repos (${pct.toFixed(0)}%)`}
                              style={{ width: `${pct}%`, background: colors[lang] || "#818cf8", minWidth: 3 }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {topLangs.map(([lang, count]) => {
                          const colors: Record<string, string> = {
                            Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#2b7489",
                            Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
                          };
                          return (
                            <button
                              key={lang}
                              onClick={() => handleTrendLangChange(lang)}
                              className="flex items-center gap-1.5 text-xs mono transition-all"
                              style={{ color: "var(--mt2)" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#38bdf8")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--mt2)")}
                            >
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[lang] || "#818cf8" }} />
                              {lang} <span style={{ color: "var(--mt)" }}>({count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📭</div>
                  <h2 className="text-lg font-bold mb-2">No trending repos found</h2>
                  <p className="text-sm" style={{ color: "var(--mt2)" }}>Try a different time range, category, or language</p>
                </div>
              )}
            </>
          )}

          {/* ── DEVELOPERS VIEW ── */}
          {trendView === "developers" && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-3xl">👨‍💻</span>
                <div>
                  <h2 className="text-lg font-bold">Developer Spotlight</h2>
                  <p className="text-xs mono" style={{ color: "var(--mt2)" }}>
                    Top developers with trending projects · {trendTimeRange.label}
                    {trendLang !== "Any" && ` · ${trendLang}`}
                  </p>
                </div>
              </div>

              {devLoading ? (
                <div className="text-center py-16">
                  <div className="spin w-10 h-10 mx-auto mb-3" />
                  <p className="text-sm" style={{ color: "var(--mt2)" }}>Loading developers...</p>
                </div>
              ) : developers.length > 0 ? (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                  {developers.map((dev, i) => (
                    <div
                      key={dev.login}
                      className="fade-up rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                      style={{
                        background: "var(--s1)",
                        border: "1px solid var(--bd)",
                        animationDelay: `${i * 60}ms`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#818cf844")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--bd)")}
                      onClick={() => setSelected(dev.repo)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img src={dev.avatar_url} alt="" className="w-12 h-12 rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={`https://github.com/${dev.login}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold hover:underline block"
                            style={{ color: "#818cf8" }}
                            onClick={e => e.stopPropagation()}
                          >
                            @{dev.login}
                          </a>
                          <p className="text-xs mono truncate" style={{ color: "var(--mt2)" }}>
                            {dev.repo.full_name}
                          </p>
                        </div>
                        {i < 3 && (
                          <span className="text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: "var(--mt2)" }}>
                        {dev.repo.description || "No description"}
                      </p>
                      <div className="flex items-center gap-3 text-xs mono" style={{ color: "var(--mt2)" }}>
                        <span>⭐ {fmtNum(dev.repo.stargazers_count)}</span>
                        <span>🍴 {fmtNum(dev.repo.forks_count)}</span>
                        {dev.repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: (dev.repo.language && { Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#2b7489", Rust: "#dea584", Go: "#00ADD8" }[dev.repo.language]) || "#818cf8" }} />
                            {dev.repo.language}
                          </span>
                        )}
                        <span className="ml-auto" style={{ color: "var(--mt)" }}>{relativeTime(dev.repo.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🔍</div>
                  <h2 className="text-lg font-bold mb-2">No developers found</h2>
                  <p className="text-sm" style={{ color: "var(--mt2)" }}>Try a broader time range or remove the language filter</p>
                </div>
              )}
            </>
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
