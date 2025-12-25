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
    console.log("QuerySummary.handleQueryUpdate ->", newQuery);
    onQueryUpdate(newQuery);
    setEditModalOpen(false);
  };

  return (
    <>
      <section className="results-head">
        <div className="head-actions">
          <button className="btn-ghost" title="Edit abstracts & keywords" onClick={() => setEditModalOpen(true)}>Edit query</button>
          <button className="btn-ghost" title="Subscribe to receive weekly updates" onClick={() => setSubscribeModalOpen(true)}>Subscribe to this query</button>
        </div>

        <div>
          {!!abstracts.length && (
            <>
              <div style={{ fontWeight: 700, opacity: .95, marginBottom: 8 }} title="Paste one or more abstracts to search">Abstracts</div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                {abstracts.map((abs, i) => (
                  <div key={i} style={{ background: "#ffffff22", padding: 14, borderRadius: 12, backdropFilter: "blur(2px)" }}>
                    <div style={{ fontSize: 12, opacity: .9, marginBottom: 4 }} title={`Abstract ${i + 1}`}>Abstract #{i + 1}</div>
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

          {/* Keywords and Year chips: place in a wrapping flex container so they don't overlap */}
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
            {!!keywords.length && (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff22', padding: 12, borderRadius: 12, minWidth: 160, maxWidth: 720 }}>
                <div style={{ fontSize: 12, opacity: .9, marginBottom: 4 }} title="Keywords — separate multiple with commas">Keywords</div>
                <div
                  style={{
                    whiteSpace: keywordsExpanded ? 'normal' : 'nowrap',
                    overflow: keywordsExpanded ? 'visible' : 'hidden',
                    textOverflow: keywordsExpanded ? 'clip' : 'ellipsis',
                    maxWidth: 680,
                  }}
                >
                  {keywords.join(', ')}
                </div>
                {keywords.join(', ').length > 80 && (
                  <button
                    type="button"
                    onClick={() => setKeywordsExpanded((v) => !v)}
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#4f46e5',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {keywordsExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

            {(query?.year_min || query?.year_max) && (
              <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff22', padding: 10, borderRadius: 12, minWidth: 120 }}>
                <div style={{ fontSize: 12, opacity: .9, marginBottom: 4 }} title="Publication year — single year or range">Year filter</div>
                <div style={{ fontWeight: 600 }} aria-live="polite">
                  {query?.year_min && query?.year_max ? (
                    query.year_min === query.year_max ? (
                      // same min and max -> show single year
                      <span aria-label={`Year ${query.year_min}`}>{query.year_min}</span>
                    ) : (
                      <>{query.year_min} — {query.year_max}</>
                    )
                  ) : query?.year_min ? (
                    <>&ge; {query.year_min}</>
                  ) : query?.year_max ? (
                    <>&le; {query.year_max}</>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            )}
          </div>

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
        currentQuery={{ abstracts, keywords, year_min: query?.year_min, year_max: query?.year_max }}
        onApply={handleQueryUpdate}
      />

      <SubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setSubscribeModalOpen(false)}
        initialQueryName={summary?.query_name || "Saved search"}
        queryParams={{
          abstracts,
          keywords,
          year_min: query?.year_min,
          year_max: query?.year_max,
        }}
      />
      
    </>
  );
}
