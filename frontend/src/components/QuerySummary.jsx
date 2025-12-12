import React, { useState } from "react";
import EditQueryModal from "./modals/EditQueryModal";
import SubscribeModal from "./modals/SubscribeModal";

// hideSimilarity: evaluation modunda, similarity/embedding ile ilgili metni gizlemek için opsiyonel flag
export default function QuerySummary({ query, resultCount, summary, onQueryUpdate, hideSimilarity = false }) {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isSubscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [expandedAbstracts, setExpandedAbstracts] = useState([]); // hangi abstract'lar tam açık
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);

  const abstracts = query?.abstracts || [];
  const keywords = query?.keywords || [];
  const page = summary?.page ?? 1;
  const per = summary?.per_page ?? 30;
  const safeCount = typeof resultCount === "number" ? resultCount : 0;
  const start = Math.min(safeCount, (page - 1) * per + 1);
  const end = Math.min(safeCount, page * per);

  const handleQueryUpdate = (newQuery) => {
    onQueryUpdate(newQuery);
    setEditModalOpen(false);
  };

  return (
    <>
      <section className="results-head">
        <div className="head-actions">
          <button className="btn-ghost" onClick={() => setEditModalOpen(true)}>Edit query</button>
          <button className="btn-ghost" onClick={() => setSubscribeModalOpen(true)}>Subscribe to this query</button>
        </div>

        <div>
          {!!abstracts.length && (
            <>
              <div style={{ fontWeight: 700, opacity: .95, marginBottom: 8 }}>Abstracts</div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                {abstracts.map((abs, i) => (
                  <div key={i} style={{ background: "#ffffff22", padding: 14, borderRadius: 12, backdropFilter: "blur(2px)" }}>
                    <div style={{ fontSize: 12, opacity: .9, marginBottom: 4 }}>Abstract #{i + 1}</div>
                    <div
                      style={{
                        whiteSpace: expandedAbstracts.includes(i) ? "normal" : "nowrap",
                        overflow: expandedAbstracts.includes(i) ? "visible" : "hidden",
                        textOverflow: expandedAbstracts.includes(i) ? "clip" : "ellipsis",
                      }}
                    >
                      {abs}
                    </div>
                    {abs.length > 150 && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedAbstracts((prev) =>
                            prev.includes(i)
                              ? prev.filter((idx) => idx !== i)
                              : [...prev, i]
                          );
                        }}
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#4f46e5", // daha koyu mor
                          textDecoration: "underline",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {expandedAbstracts.includes(i) ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!!keywords.length && (
            <div style={{ marginTop: 12, display: "inline-block", background: "#ffffff22", padding: 12, borderRadius: 12 }}>
              <div style={{ fontSize: 12, opacity: .9, marginBottom: 4 }}>Keywords</div>
              <div
                style={{
                  whiteSpace: keywordsExpanded ? "normal" : "nowrap",
                  overflow: keywordsExpanded ? "visible" : "hidden",
                  textOverflow: keywordsExpanded ? "clip" : "ellipsis",
                  maxWidth: 600,
                }}
              >
                {keywords.join(", ")}
              </div>
              {keywords.join(", ").length > 80 && (
                <button
                  type="button"
                  onClick={() => setKeywordsExpanded((v) => !v)}
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#4f46e5", // daha koyu mor
                    textDecoration: "underline",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {keywordsExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {safeCount > 0 && (
            <p style={{ marginTop: 16, opacity: .9 }}>
              Showing {start}-{end} of {safeCount} results
            </p>
          )}

          {!hideSimilarity && (
            <p style={{ marginTop: safeCount > 0 ? 4 : 16, opacity: .9 }}>
              Search simulated with {summary?.abstracts_count ?? abstracts.length} abstract
              {(summary?.abstracts_count ?? abstracts.length) === 1 ? "" : "s"} and
              {" "}
              {summary?.keywords_count ?? keywords.length} keyword
              {(summary?.keywords_count ?? keywords.length) === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      </section>

      <EditQueryModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentQuery={{ abstracts, keywords }}
        onApply={handleQueryUpdate}
      />
      <SubscribeModal isOpen={isSubscribeModalOpen} onClose={() => setSubscribeModalOpen(false)} />
    </>
  );
}
