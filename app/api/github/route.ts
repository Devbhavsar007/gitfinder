import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_TRENDING_REPOS, FALLBACK_DEVELOPERS } from "@/lib/fallback-data";

const GH = "https://api.github.com";

// In-memory cache to stay well within GitHub's unauthenticated 10 req/min limit
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): { data: T; isFresh: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const isFresh = Date.now() - entry.timestamp < CACHE_TTL_MS;
  return { data: entry.data, isFresh };
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, timestamp: Date.now() });
}

function getValidToken(): string | null {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) return null;
  // Ignore common placeholders or malformed tokens
  if (
    token === "ghp_your_token_here" ||
    token.includes("your_token_here") ||
    token === "undefined" ||
    token === "null" ||
    token.length < 10
  ) {
    return null;
  }
  return token;
}

// Server-side proxy — GITHUB_TOKEN never reaches the browser
async function ghFetch(url: string, retryWithoutAuth = true): Promise<Response> {
  const token = getValidToken();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.mercy-preview+json",
    "User-Agent": "GitFinder/2.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers, next: { revalidate: 120 } });

  // If token is invalid or expired (401 Bad credentials), automatically retry without auth
  if (res.status === 401 && token && retryWithoutAuth) {
    console.warn("[GitFinder API] GITHUB_TOKEN was rejected by GitHub (401 Bad credentials). Retrying unauthenticated.");
    const fallbackHeaders: Record<string, string> = {
      Accept: "application/vnd.github.mercy-preview+json",
      "User-Agent": "GitFinder/2.0",
    };
    return fetch(url, { headers: fallbackHeaders, next: { revalidate: 120 } });
  }

  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    // ── SEARCH ──
    if (action === "search") {
      const q = searchParams.get("q") || "";
      const page = searchParams.get("page") || "1";
      if (!q.trim()) return NextResponse.json({ error: "Empty query" }, { status: 400 });

      const cacheKey = `search:${q}:${page}`;
      const cached = getCached<any>(cacheKey);
      if (cached && cached.isFresh) {
        return NextResponse.json(cached.data);
      }

      const res = await ghFetch(
        `${GH}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=15&page=${page}`
      );
      if (!res.ok) {
        if (cached) return NextResponse.json({ ...cached.data, rate_limited: true, cached: true });
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err.message || `GitHub API error (${res.status})` }, { status: res.status });
      }
      const data = await res.json();
      setCache(cacheKey, data);
      return NextResponse.json(data);
    }

    // ── README ──
    if (action === "readme") {
      const owner = searchParams.get("owner");
      const repo = searchParams.get("repo");
      if (!owner || !repo) return NextResponse.json({ error: "Missing owner/repo" }, { status: 400 });

      const cacheKey = `readme:${owner}:${repo}`;
      const cached = getCached<any>(cacheKey);
      if (cached && cached.isFresh) return NextResponse.json(cached.data);

      const res = await ghFetch(`${GH}/repos/${owner}/${repo}/readme`);
      if (!res.ok) {
        if (cached) return NextResponse.json(cached.data);
        return NextResponse.json({ content: "" });
      }
      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const result = { content };
      setCache(cacheKey, result);
      return NextResponse.json(result);
    }

    // ── TRENDING (Enhanced with Cache & Fallback) ──
    if (action === "trending") {
      const category = searchParams.get("category") || "";
      const daysAgo = parseInt(searchParams.get("days") || "7");
      const sort = searchParams.get("sort") || "stars";
      const lang = searchParams.get("lang") || "";
      const perPage = Math.min(parseInt(searchParams.get("per_page") || "30"), 100);
      const page = searchParams.get("page") || "1";

      const cacheKey = `trending:${category}:${daysAgo}:${sort}:${lang}:${page}:${perPage}`;
      const cached = getCached<any>(cacheKey);

      // If we have a fresh cache entry, return it immediately!
      if (cached && cached.isFresh) {
        return NextResponse.json(cached.data);
      }

      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split("T")[0];

      let q = category ? category + " " : "";
      q += `created:>${dateStr}`;
      if (lang && lang !== "Any") q += ` language:${lang}`;

      try {
        const res = await ghFetch(
          `${GH}/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${perPage}&page=${page}`
        );

        if (res.ok) {
          const data = await res.json();
          // If GitHub returned items, cache and return
          if (data.items && data.items.length > 0) {
            setCache(cacheKey, data);
            return NextResponse.json(data);
          }
        }

        // If rate limited or empty and we have stale cache, serve it!
        if (cached && cached.data?.items?.length > 0) {
          return NextResponse.json({ ...cached.data, rate_limited: true, cached: true });
        }

        // If still empty, return fallback data filtered by language if applicable
        let fallbackItems = [...FALLBACK_TRENDING_REPOS];
        if (lang && lang !== "Any") {
          fallbackItems = fallbackItems.filter(r => r.language?.toLowerCase() === lang.toLowerCase());
          if (fallbackItems.length === 0) fallbackItems = FALLBACK_TRENDING_REPOS;
        }

        return NextResponse.json({
          items: fallbackItems,
          total_count: fallbackItems.length,
          rate_limited: !res.ok,
          fallback: true,
        });
      } catch {
        if (cached) return NextResponse.json({ ...cached.data, cached: true });
        return NextResponse.json({
          items: FALLBACK_TRENDING_REPOS,
          total_count: FALLBACK_TRENDING_REPOS.length,
          rate_limited: true,
          fallback: true,
        });
      }
    }

    // ── DEVELOPER SPOTLIGHT ──
    if (action === "developer") {
      const lang = searchParams.get("lang") || "";
      const daysAgo = parseInt(searchParams.get("days") || "30");
      const cacheKey = `devs:${lang}:${daysAgo}`;
      const cached = getCached<any>(cacheKey);
      if (cached && cached.isFresh) return NextResponse.json(cached.data);

      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split("T")[0];

      let q = `created:>${dateStr} stars:>50`;
      if (lang && lang !== "Any") q += ` language:${lang}`;

      try {
        const res = await ghFetch(
          `${GH}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`
        );
        if (res.ok) {
          const data = await res.json();
          const seen = new Set<string>();
          const devRepos: Array<{ login: string; avatar_url: string; repo: typeof data.items[0] }> = [];
          for (const item of data.items || []) {
            if (!seen.has(item.owner.login)) {
              seen.add(item.owner.login);
              devRepos.push({
                login: item.owner.login,
                avatar_url: item.owner.avatar_url,
                repo: item,
              });
            }
            if (devRepos.length >= 10) break;
          }
          if (devRepos.length > 0) {
            const result = { developers: devRepos };
            setCache(cacheKey, result);
            return NextResponse.json(result);
          }
        }

        if (cached) return NextResponse.json({ ...cached.data, rate_limited: true, cached: true });
        return NextResponse.json({ developers: FALLBACK_DEVELOPERS, rate_limited: true, fallback: true });
      } catch {
        if (cached) return NextResponse.json(cached.data);
        return NextResponse.json({ developers: FALLBACK_DEVELOPERS, rate_limited: true, fallback: true });
      }
    }

    // ── RATE LIMIT CHECK ──
    if (action === "status") {
      const res = await ghFetch(`${GH}/rate_limit`);
      const data = await res.json().catch(() => ({}));
      const token = getValidToken();
      return NextResponse.json({
        authenticated: !!token && res.status !== 401,
        remaining: data.resources?.search?.remaining ?? 0,
        limit: data.resources?.search?.limit ?? 10,
        reset: data.resources?.search?.reset ?? 0,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
