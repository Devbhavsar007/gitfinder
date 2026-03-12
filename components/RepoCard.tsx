"use client";
import { Repo, scoreRepo, qualityColor, qualityText, fmtNum, fmtDate, LANG_COLORS } from "@/lib/github";

export default function RepoCard({
  repo, idx, onSelect,
}: {
  repo: Repo; idx: number; onSelect: (r: Repo, score: number) => void;
}) {
  const score = scoreRepo(repo);
  const qc = qualityColor(score);

  return (
    <div
      data-no-trail=""
      className="fade-up cursor-pointer rounded-xl border p-4 flex flex-col gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "var(--s1)", borderColor: "var(--bd)",
        animationDelay: `${idx * 50}ms`,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#38bdf844")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--bd)")}
      onClick={() => onSelect(repo, score)}
    >
      {/* Top row */}
      <div className="flex items-center gap-2">
        <img src={repo.owner.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 text-sm truncate">
          <span style={{ color: "var(--mt2)" }}>{repo.owner.login}</span>
          <span style={{ color: "var(--bd)" }}>/</span>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>{repo.name}</span>
        </div>
        <div className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mono"
          style={{ color: qc, borderColor: qc + "44", background: qc + "10", border: "1px solid" }}>
          {qualityText(score)}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed line-clamp-2 min-h-[36px]" style={{ color: "var(--mt2)" }}>
        {repo.description || <em style={{ color: "var(--mt)" }}>No description — click to read README</em>}
      </p>

      {/* Topics */}
      {repo.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full mono"
              style={{ background: "#38bdf808", border: "1px solid #38bdf820", color: "#38bdf8" }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2.5 flex-wrap mt-auto">
        <span className="flex items-center gap-1 text-xs mono" style={{ color: "var(--mt2)" }}>
          <StarIcon /> {fmtNum(repo.stargazers_count)}
        </span>
        <span className="flex items-center gap-1 text-xs mono" style={{ color: "var(--mt2)" }}>
          <ForkIcon /> {fmtNum(repo.forks_count)}
        </span>
        {repo.language && (
          <span className="flex items-center gap-1 text-xs mono" style={{ color: "var(--mt2)" }}>
            <span className="w-2 h-2 rounded-full inline-block"
              style={{ background: LANG_COLORS[repo.language] || "#6e7681" }} />
            {repo.language}
          </span>
        )}
        {repo.homepage && (
          <span className="flex items-center gap-1 text-xs mono" style={{ color: "#f59e0b" }}>
            <GlobeIcon /> Site
          </span>
        )}
        <span className="text-xs ml-auto mono" style={{ color: "var(--mt)" }}>
          {fmtDate(repo.created_at)}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--bd)" }}>
        <div className="h-full rounded-full" style={{
          width: `${score}%`,
          background: `linear-gradient(90deg, ${qc}, ${qc}66)`,
        }} />
      </div>
    </div>
  );
}

function StarIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
}
function ForkIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M6 9v2c0 1.7 1.3 3 3 3h6c1.7 0 3-1.3 3-3V9" /><line x1="12" y1="15" x2="12" y2="12" /></svg>;
}
function GlobeIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
}
