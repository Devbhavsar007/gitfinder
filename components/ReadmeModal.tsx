"use client";
import { useState, useEffect } from "react";
import { Repo, fetchReadme, mdToHtml } from "@/lib/github";

export default function ReadmeModal({ repo, onClose }: { repo: Repo; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    fetchReadme(repo.owner.login, repo.name).then(setContent);
  }, [repo]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#000000aa", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="rounded-2xl w-full max-w-[720px] max-h-[88vh] overflow-hidden flex flex-col"
        style={{ background: "var(--s1)", border: "1px solid var(--bd)", animation: "fadeUp .2s both" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--bd)" }}>
          <div className="flex items-center gap-2 text-sm font-bold mono" style={{ color: "var(--mt2)" }}>
            📄 {repo.owner.login}/{repo.name} · README
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "var(--s2)", border: "1px solid var(--bd)", color: "var(--mt2)" }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {content === null ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="spin w-8 h-8" />
              <p className="text-sm" style={{ color: "var(--mt2)" }}>Fetching README from GitHub...</p>
            </div>
          ) : content ? (
            <div className="md-render" dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
          ) : (
            <p className="text-center py-16 italic" style={{ color: "var(--mt)" }}>
              No README found for this repository.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
