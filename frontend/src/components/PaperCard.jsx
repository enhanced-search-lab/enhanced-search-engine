import React, { useState } from "react";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "0");

export default function PaperCard({ paper }) {
  const [expanded, setExpanded] = useState(false);

  const authorsText =
    paper.authors_text || (paper.authors?.length ? paper.authors.slice(0, 6).join(", ") : "");

  const abs = paper.abstract || "";
  const needsToggle = abs.length > 260;
  const shown = expanded ? abs : abs.slice(0, 260);

  return (
    <article className="result-card">
      <div className="rc-title">
        <a href={paper.id || paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
        <div style={{display:"flex", gap:8}}>
          {typeof paper.relevance_pct === "number" && (
            <span className="badge badge-green">{"relevance score: " + paper.relevance_pct}</span>
          )}
          {paper.is_open_access && (
            <a href={paper.oa_url || paper.url} target="_blank" rel="noreferrer" className="badge badge-amber">
              Open Access
            </a>
          )}
        </div>
      </div>

      <div className="rc-sub">
        {authorsText}
        {paper.year ? <> • {paper.year}</> : null}
        {paper.venue ? <> • <i>{paper.venue}</i></> : null}
      </div>

      {abs && (
        <p className="rc-abs">
          {shown}
          {needsToggle && !expanded && "… "}
          {needsToggle && (
            <button onClick={() => setExpanded((v) => !v)}> {expanded ? "Show less" : "Show more"}</button>
          )}
        </p>
      )}

      {paper.concepts?.length ? (
        <div className="concepts">
          {paper.concepts.slice(0, 8).map((c) => (
            <span key={c} className="concept">{c}</span>
          ))}
        </div>
      ) : null}

      <div className="rc-footer">
        <span>🔗 {fmt(paper.cited_by_count)} citations</span>
        <span>📚 {fmt(paper.references_count)} references</span>
      </div>
    </article>
  );
}