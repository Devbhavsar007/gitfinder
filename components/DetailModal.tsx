"use client";
import { useState } from "react";
import { Repo, scoreRepo, qualityColor, qualityText, fmtNum, fmtDate, LANG_COLORS } from "@/lib/github";

export default function DetailModal({
  repo, onClose, onReadme,
}: {
  repo: Repo; onClose: () => void; onReadme: (r: Repo) => void;
}) {
  const [copied, setCopied] = useState(false);
  const score = scoreRepo(repo);
  const qc = qualityColor(score);
  const clone = `git clone ${repo.clone_url}`;

  const copy = () => {
    navigator.clipboard.writeText(clone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#000000aa", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="relative rounded-2xl w-full max-w-[600px] max-h-[88vh] overflow-y-auto p-7"
        style={{ background: "var(--s1)", border: "1px solid var(--bd)", animation: "fadeUp .2s both" }}
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
          style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: "var(--mt2)" }}>
          ✕
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-3 pr-10">
          <img src={repo.owner.avatar_url} alt="" className="w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <a href={repo.html_url} target="_blank" rel="noreferrer"
              className="block text-lg font-bold hover:underline" style={{ color: "var(--tx)", wordBreak: "break-all" }}>
              {repo.owner.login}/<strong style={{ color: "#38bdf8" }}>{repo.name}</strong>
            </a>
            {repo.homepage && (
              <a href={repo.homepage} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs mono mt-1 hover:underline"
                style={{ color: "#f59e0b", wordBreak: "break-all" }}>
                🌐 {repo.homepage.replace(/^https?:\/\//, "").slice(0, 55)}
              </a>
            )}
          </div>
          <div className="text-xs font-bold px-2.5 py-1 rounded-full mono flex-shrink-0"
            style={{ color: qc, border: `1px solid ${qc}44`, background: qc + "18" }}>
            {qualityText(score)} · {score}/100
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--mt2)" }}>
          {repo.description || "No description. Click Read README to learn more."}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          {[
            { icon: "⭐", val: fmtNum(repo.stargazers_count), label: "Stars" },
            { icon: "🍴", val: fmtNum(repo.forks_count), label: "Forks" },
            { icon: "👁", val: fmtNum(repo.watchers_count), label: "Watchers" },
            { icon: "🐛", val: fmtNum(repo.open_issues_count), label: "Issues" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center flex flex-col items-center gap-1"
              style={{ background: "var(--s2)", border: "1px solid var(--bd)" }}>
              <span className="text-base">{s.icon}</span>
              <span className="text-base font-bold mono">{s.val}</span>
              <span className="text-xs" style={{ color: "var(--mt)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {repo.language && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mono"
              style={{ border: `1px solid ${(LANG_COLORS[repo.language] || "#6e7681") + "55"}`, color: "var(--mt2)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[repo.language] || "#6e7681" }} />
              {repo.language}
            </span>
          )}
          {repo.license && (
            <span className="px-2.5 py-1 rounded-full text-xs mono" style={{ border: "1px solid var(--bd)", color: "var(--mt2)" }}>
              📄 {repo.license.spdx_id}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-xs mono" style={{ border: "1px solid var(--bd)", color: "var(--mt2)" }}>
            📅 {fmtDate(repo.created_at)}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs mono" style={{ border: "1px solid var(--bd)", color: "var(--mt2)" }}>
            🔄 {fmtDate(repo.pushed_at)}
          </span>
        </div>

        {/* Topics */}
        {repo.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {repo.topics.map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full mono"
                style={{ background: "#38bdf808", border: "1px solid #38bdf820", color: "#38bdf8" }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Clone */}
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-4 overflow-hidden"
          style={{ background: "#07080c", border: "1px solid var(--bd)" }}>
          <code className="text-xs flex-1 truncate mono" style={{ color: "#38bdf8" }}>{clone}</code>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0 mono transition-colors"
            style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: copied ? "#4ade80" : "var(--mt2)" }}>
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap mb-5">
          <a href={repo.html_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-85"
            style={{ background: "var(--tx)", color: "#000" }}>
            <GhIcon /> GitHub
          </a>
          <button onClick={() => onReadme(repo)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: "var(--mt2)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf844"; e.currentTarget.style.color = "var(--tx)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.color = "var(--mt2)"; }}>
            📄 README
          </button>
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: "var(--mt2)" }}>
              🌐 Live Site
            </a>
          )}
        </div>

        {/* Quality breakdown */}
        <div className="rounded-xl p-4" style={{ background: "var(--s2)", border: "1px solid var(--bd)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mono mb-2.5" style={{ color: "var(--mt2)" }}>Quality Signals</p>
          <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: "var(--bd)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: `linear-gradient(90deg, ${qc}, ${qc}88)` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {repo.stargazers_count > 1000 && <Sig good>⭐ 1k+ stars</Sig>}
            {repo.homepage && <Sig good>🌐 Live site</Sig>}
            {repo.license && <Sig good>📄 Licensed</Sig>}
            {(repo.topics || []).length > 3 && <Sig good>🏷 Rich topics</Sig>}
            {repo.has_wiki && <Sig good>📚 Wiki</Sig>}
            {(Date.now() - new Date(repo.pushed_at).getTime()) / 86400000 < 90 && <Sig good>🔥 Active</Sig>}
            {repo.forks_count > 50 && <Sig good>🍴 50+ forks</Sig>}
            {!repo.description && <Sig good={false}>⚠ No description</Sig>}
            {!repo.license && <Sig good={false}>⚠ No license</Sig>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sig({ children, good }: { children: React.ReactNode; good: boolean }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full mono"
      style={good
        ? { background: "#4ade8012", border: "1px solid #4ade8030", color: "#4ade80" }
        : { background: "#f59e0b12", border: "1px solid #f59e0b30", color: "#f59e0b" }}>
      {children}
    </span>
  );
}

function GhIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" /></svg>;
}
