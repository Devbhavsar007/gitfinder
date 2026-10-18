import { NextRequest, NextResponse } from "next/server";

const GH = "https://api.github.com";

// Server-side proxy — GITHUB_TOKEN never reaches the browser
async function ghFetch(url: string) {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.mercy-preview+json",
    "User-Agent": "GitFinder/2.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { headers, next: { revalidate: 60 } });
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

      const res = await ghFetch(
        `${GH}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=15&page=${page}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err.message || `GitHub ${res.status}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    // ── README ──
    if (action === "readme") {
      const owner = searchParams.get("owner");
      const repo = searchParams.get("repo");
      if (!owner || !repo) return NextResponse.json({ error: "Missing owner/repo" }, { status: 400 });

      const res = await ghFetch(`${GH}/repos/${owner}/${repo}/readme`);
      if (!res.ok) return NextResponse.json({ content: "" });
      const data = await res.json();
      // Decode base64 server-side, return plain text
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return NextResponse.json({ content });
    }

    // ── TRENDING (Enhanced) ──
    if (action === "trending") {
      const category = searchParams.get("category") || "";
      const daysAgo = parseInt(searchParams.get("days") || "7");
      const sort = searchParams.get("sort") || "stars";
      const lang = searchParams.get("lang") || "";
      const perPage = Math.min(parseInt(searchParams.get("per_page") || "30"), 100);
      const page = searchParams.get("page") || "1";

      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split("T")[0];

      let q = category ? category + " " : "";
      q += `created:>${dateStr}`;
      if (lang && lang !== "Any") q += ` language:${lang}`;

      const res = await ghFetch(
        `${GH}/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${perPage}&page=${page}`
      );
      if (!res.ok) return NextResponse.json({ items: [], total_count: 0 });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // ── DEVELOPER SPOTLIGHT ──
    if (action === "developer") {
      const lang = searchParams.get("lang") || "";
      const daysAgo = parseInt(searchParams.get("days") || "30");
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split("T")[0];

      let q = `created:>${dateStr} stars:>50`;
      if (lang && lang !== "Any") q += ` language:${lang}`;

      const res = await ghFetch(
        `${GH}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`
      );
      if (!res.ok) return NextResponse.json({ items: [] });
      const data = await res.json();

      // Extract unique developers with their top repo
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
      return NextResponse.json({ developers: devRepos });
    }

    // ── RATE LIMIT CHECK ──
    if (action === "status") {
      const res = await ghFetch(`${GH}/rate_limit`);
      const data = await res.json();
      return NextResponse.json({
        authenticated: !!process.env.GITHUB_TOKEN,
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
