import React, { useState } from "react";

const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : "0");

// hideSimilarity: evaluation modunda similarity badge'ini gizlemek için opsiyonel flag
export default function PaperCard({ paper, hideSimilarity = false }) {
  const [expanded, setExpanded] = useState(false);

  const authorsText =
    paper.authors_text || (paper.authors?.length ? paper.authors.slice(0, 6).join(", ") : "");

  const abs = paper.abstract || "";
  const needsToggle = abs.length > 260;
  const shown = expanded ? abs : abs.slice(0, 260);

  return (
    <article className="result-card">
      <div className="rc-title">
        <a href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a>
        <div style={{ display: "flex", gap: 8 }}>
          {!hideSimilarity && paper.per_abstract_sims && paper.per_abstract_sims.length > 0 && (
            <span
              className="badge badge-green"
              style={{
                padding: "6px 12px",
                borderRadius: "15px",
                fontSize: "0.9rem",
                fontWeight: "bold",
                display: "flex", /* Use flexbox for centering */
                justifyContent: "center", /* Center text horizontally */
                alignItems: "center", /* Center text vertically */
                textAlign: "center",
                minWidth: "150px", /* Ensure consistent width */
                height: "35px", /* Ensure consistent height */
                backgroundColor: "#10b981", /* Green background */
                color: "#fff", /* White text */
              }}
            >
              {(() => {
                const avg = paper.per_abstract_sims.reduce((a, b) => a + b, 0) / paper.per_abstract_sims.length;
                const percentage = (avg * 100).toFixed(2);
                return `Similarity: ${percentage}%`;
              })()}
            </span>
          )}
          {paper.is_open_access && (
            <a
              href={paper.oa_url || paper.url}
              target="_blank"
              rel="noreferrer"
              className="badge badge-amber"
              style={{
                padding: "6px 12px",
                borderRadius: "15px",
                fontSize: "0.9rem",
                fontWeight: "bold",
                display: "flex", /* Use flexbox for centering */
                justifyContent: "center", /* Center text horizontally */
                alignItems: "center", /* Center text vertically */
                textAlign: "center",
                minWidth: "150px", /* Ensure consistent width */
                height: "35px", /* Ensure consistent height */
                textDecoration: "none",
                color: "#fff", /* White text */
                backgroundColor: "#f59e0b", /* Amber background */
              }}
            >
              🌐 Open Access
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
            <button onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : "Show more"}
            </button>
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