export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: { spdx_id: string } | null;
  created_at: string;
  pushed_at: string;
  updated_at: string;
  has_wiki: boolean;
  owner: { login: string; avatar_url: string };
}

export interface SearchResult {
  total_count: number;
  items: Repo[];
  error?: string;
}

const API = "/api/github";

export async function searchRepos(q: string, page = 1): Promise<SearchResult> {
  const res = await fetch(`${API}?action=search&q=${encodeURIComponent(q)}&page=${page}`);
  return res.json();
}

export async function fetchReadme(owner: string, repo: string): Promise<string> {
  const res = await fetch(`${API}?action=readme&owner=${owner}&repo=${encodeURIComponent(repo)}`);
  const data = await res.json();
  return data.content || "";
}

export async function fetchTrending(category: string, days = 30): Promise<Repo[]> {
  const res = await fetch(`${API}?action=trending&category=${encodeURIComponent(category)}&days=${days}`);
  const data = await res.json();
  return data.items || [];
}

export async function fetchStatus() {
  const res = await fetch(`${API}?action=status`);
  return res.json();
}

// ── Quality Scoring ──
export function scoreRepo(r: Repo): number {
  let s = 0;
  const stars = r.stargazers_count || 0;
  const forks = r.forks_count || 0;
  const topics = (r.topics || []).length;
  const descLen = (r.description || "").length;
  const daysSince = (Date.now() - new Date(r.pushed_at).getTime()) / 86400000;

  if (stars >= 10000) s += 30; else if (stars >= 1000) s += 22;
  else if (stars >= 500) s += 16; else if (stars >= 100) s += 10;
  else if (stars >= 10) s += 5; else s += 1;

  if (forks >= 1000) s += 15; else if (forks >= 100) s += 10;
  else if (forks >= 10) s += 6; else if (forks >= 1) s += 2;

  if (daysSince < 7) s += 15; else if (daysSince < 30) s += 12;
  else if (daysSince < 90) s += 8; else if (daysSince < 365) s += 4;

  s += Math.min(topics * 2, 10);

  if (descLen > 80) s += 8; else if (descLen > 30) s += 5; else if (descLen > 0) s += 2;

  if (r.homepage?.trim()) s += 10;
  if (r.has_wiki) s += 4;
  if (r.license) s += 5;
  if (stars > 0 && (r.open_issues_count || 0) < stars * 0.1) s += 3;

  return Math.min(s, 100);
}

export function qualityLabel(score: number) {
  if (score >= 55) return "advanced";
  if (score >= 28) return "intermediate";
  return "basic";
}

export function qualityColor(score: number) {
  if (score >= 55) return "#f59e0b";
  if (score >= 28) return "#38bdf8";
  return "#4ade80";
}

export function qualityText(score: number) {
  if (score >= 55) return "Advanced";
  if (score >= 28) return "Intermediate";
  return "Basic";
}

export function fmtNum(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export function fmtDate(iso: string) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#2b7489",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  Kotlin: "#F18E33", Swift: "#ffac45", Ruby: "#701516", PHP: "#4F5D95",
  "C#": "#178600", Dart: "#00B4AB", Shell: "#89e051",
};

export const DATE_FILTERS = [
  { label: "Any time", value: "" },
  { label: "Today", value: () => new Date().toISOString().split("T")[0] },
  { label: "Yesterday", value: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; } },
  { label: "This week", value: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; } },
  { label: "This month", value: () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; } },
  { label: "This year", value: () => `${new Date().getFullYear()}-01-01` },
  { label: "2024", value: "2024-01-01..2024-12-31" },
  { label: "2023", value: "2023-01-01..2023-12-31" },
  { label: "2022", value: "2022-01-01..2022-12-31" },
  { label: "2021", value: "2021-01-01..2021-12-31" },
  { label: "Last year", value: () => { const y = new Date().getFullYear() - 1; return `${y}-01-01..${y}-12-31`; } },
];

export const QUALITY_LEVELS = [
  { label: "All", value: "all", color: "#94a3b8" },
  { label: "Advanced", value: "advanced", color: "#f59e0b", desc: "High stars · Active · Rich docs · Live site" },
  { label: "Intermediate", value: "intermediate", color: "#38bdf8", desc: "Decent stars · Good docs · Maintained" },
  { label: "Basic", value: "basic", color: "#4ade80", desc: "Learning projects · Simple scope" },
];

export const LANGS = ["Any", "Python", "JavaScript", "TypeScript", "Rust", "Go", "Java", "C++", "Swift", "Kotlin", "PHP", "Ruby", "C#", "Dart", "Shell"];

export const TRENDING_CATEGORIES = [
  { label: "AI / ML", query: "machine learning artificial intelligence", icon: "🤖" },
  { label: "LLM Apps", query: "llm langchain openai chatgpt agent", icon: "🧠" },
  { label: "Web3", query: "blockchain web3 solidity ethereum", icon: "⛓️" },
  { label: "DevTools", query: "developer tools cli productivity dx", icon: "🛠️" },
  { label: "Rust", query: "rust systems programming", icon: "🦀" },
  { label: "SaaS", query: "saas open source self-hosted", icon: "☁️" },
  { label: "Security", query: "security pentesting cybersecurity", icon: "🔐" },
  { label: "Game Dev", query: "game engine gamedev 2d 3d", icon: "🎮" },
];

export function getDateVal(f: { value: string | (() => string) }): string {
  return typeof f.value === "function" ? f.value() : f.value;
}

export function buildSearchQuery(query: string, dateFilter: { value: string | (() => string) }, lang: string): string {
  let q = query.trim();
  const dv = getDateVal(dateFilter);
  if (dv) q += dv.includes("..") ? ` created:${dv}` : ` created:>${dv}`;
  if (lang && lang !== "Any") q += ` language:${lang}`;
  return q;
}

export function mdToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\n\n+/g, "<br/><br/>");
}
