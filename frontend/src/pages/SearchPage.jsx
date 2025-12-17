import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import QuerySummary from "../components/QuerySummary";
import SearchResultsList from "../components/SearchResultsList";
import SubscribeModal from "../components/modals/SubscribeModal";
import EvalFeedback from "../components/EvalFeedback";
import {
  searchPapersPOST,
  searchOpenAlexKeywordPOST,
  searchOpenAlexGeminiPOST,
  sendEvalFeedback,
} from "../services/api";

// Feature flag: show evaluation (raw OpenAlex keyword results) only when enabled via env
const SHOW_EVAL =
  (import.meta.env && import.meta.env.VITE_SHOW_EVAL === "true") ||
  (typeof process !== "undefined" && process.env?.VITE_SHOW_EVAL === "true");

export default function SearchPage() {

  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [subscribeOpen, setSubscribeOpen] = useState(false);


  const boot =
    location.state ??
    (sessionStorage.getItem("lastSearch")
      ? JSON.parse(sessionStorage.getItem("lastSearch"))
      : null);

  const [request, setRequest] = useState(boot?.request ?? null);
  const [data, setData] = useState(boot?.data ?? null);
  const [openAlexData, setOpenAlexData] = useState(null); // raw keyword-only OpenAlex results
  const [openAlexGeminiData, setOpenAlexGeminiData] = useState(null); // LLM+user keyword OpenAlex results
  const [query, setQuery] = useState(boot?.request ?? { abstracts: [], keywords: [] });
  const [loading, setLoading] = useState(false);
  const [loadingOpenAlex, setLoadingOpenAlex] = useState(false);
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [layout] = useState(() => {
    // Eval layout: which pipeline (embedding/raw_openalex/gemini_openalex)
    // shows up in left, middle, right columns. Randomized per page load.
    const base = ["embedding", "raw_openalex", "gemini_openalex"];
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    return {
      left: base[0],
      middle: base[1],
      right: base[2],
    };
  });
  const [error, setError] = useState("");
  const [evalSubmitting, setEvalSubmitting] = useState(false);
  // Sort-only state (client-side, applies only when eval is OFF)
  const [sortBy, setSortBy] = useState("similarity"); // similarity | year | citations | references
  const [sortDirDesc, setSortDirDesc] = useState(true);
  const mapSortLabel = (s) => {
    if (s === 'similarity') return 'Similarity';
    if (s === 'year') return 'Year';
    if (s === 'citations') return 'Citations';
    if (s === 'references') return 'References';
    return s;
  };

  const queryFromURL = useMemo(() => {
    const abstracts = params.getAll("abstract");
    const keywords = (params.get("keywords") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { abstracts, keywords };
  }, [params]);

  const page = Number(params.get("page") || 1);

  useEffect(() => {
    const { abstracts, keywords } = queryFromURL;
    if (!abstracts.length && !keywords.length) return;

    // 1) Main embedding-based search
    // Embedding endpoint'ini sadece request/data henüz yoksa çağır.
    if (!request || !data) {
      setLoading(true);
      setError("");

      searchPapersPOST({ ...queryFromURL, page, per_page: 30 }) // Default increased to 30
        .then((res) => {
          setRequest(queryFromURL);
          setData(res);
          setQuery(queryFromURL);
          sessionStorage.setItem("lastSearch", JSON.stringify({ request: queryFromURL, data: res }));
        })
        .catch((e) => setError(e.message || "Search failed"))
        .finally(() => setLoading(false));
    }

    // 2) Raw keyword-only OpenAlex search (only if evaluation flag is on and there are keywords)
    if (SHOW_EVAL && keywords && keywords.length) {
      setLoadingOpenAlex(true);
      searchOpenAlexKeywordPOST({ keywords, per_page: 30 })
        .then((raw) => setOpenAlexData(raw))
        .catch((e) => {
          console.warn("OpenAlex keyword search failed:", e);
          setOpenAlexData(null);
        })
        .finally(() => setLoadingOpenAlex(false));
    } else {
      setOpenAlexData(null);
      setLoadingOpenAlex(false);
    }

    // 3) Gemini+user keywords OpenAlex search (3rd column in eval mode)
    if (SHOW_EVAL && abstracts && abstracts.length && keywords && keywords.length) {
      setLoadingGemini(true);
      searchOpenAlexGeminiPOST({
        abstracts,
        keywords,
        per_page: 30,
      })
        .then((raw) => setOpenAlexGeminiData(raw))
        .catch((e) => {
          console.warn("OpenAlex Gemini keyword search failed:", e);
          setOpenAlexGeminiData(null);
        })
        .finally(() => setLoadingGemini(false));
    } else {
      setOpenAlexGeminiData(null);
      setLoadingGemini(false);
    }
  }, [queryFromURL, page, request, data]);

  // Tüm ilgili sütunlar (geçerli oldukları durumda) hazır mı?
  const abstracts = queryFromURL.abstracts;
  const keywords = queryFromURL.keywords;

  const allReady =
    !!data &&
    (!SHOW_EVAL || !keywords.length || !!openAlexData) &&
    (!SHOW_EVAL || !abstracts.length || !keywords.length || !!openAlexGeminiData);

  const gotoPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
    if (request) {
      setLoading(true);
      searchPapersPOST({ ...request, page: p, per_page: 30 }) // Default increased to 30
        .then((res) => {
          setData(res);
          sessionStorage.setItem("lastSearch", JSON.stringify({ request, data: res }));
        })
        .finally(() => setLoading(false));
    }
  };

  const handleEvalSubmit = async ({ choice, comment }) => {
    if (!SHOW_EVAL || !data || !openAlexData) return;
    setEvalSubmitting(true);
    try {
      // Map normalized choice (left/middle/right) to actual pipeline label
      let chosen_setup = null;
      if (choice === "left") chosen_setup = layout.left;
      else if (choice === "middle") chosen_setup = layout.middle;
      else if (choice === "right") chosen_setup = layout.right;
      const payload = {
        query,
        choice,
        comment,
        layout,
        chosen_setup,
        // basitçe iki listenin ilk birkaç ID'sini de ekleyelim (opsiyonel, backend için faydalı olabilir)
        left_ids: (data.results || []).slice(0, 50).map((p) => p.id),
        right_ids: (openAlexData.results || []).slice(0, 50).map((p) => p.id),
      };

      // Construct the persisted-like object to return to the caller so the UI can
      // immediately show what was recorded. We include a local timestamp.
      const persisted = {
        query: payload.query,
        choice: payload.choice,
        comment: payload.comment,
        layout: payload.layout,
        chosen_setup: payload.chosen_setup,
        ts: new Date().toISOString(),
      };

      await sendEvalFeedback(payload);
      return persisted;
    } catch (e) {
      console.warn("Eval feedback send failed", e);
      // Even if sending failed, return a local persisted object so the UI can
      // show immediate feedback to the user.
      return {
        query,
        choice,
        comment,
        layout,
        chosen_setup: choice === "left" ? layout.left : choice === "middle" ? layout.middle : layout.right,
        ts: new Date().toISOString(),
      };
    } finally {
      setEvalSubmitting(false);
    }
  };

  const handleQueryUpdate = ({ abstracts, keywords }) => {
    const safeAbstracts = abstracts || [];
    const safeKeywords = keywords || [];

    const nextQuery = { abstracts: safeAbstracts, keywords: safeKeywords };
    // QuerySummary'de gösterilen metni sonuç beklemeden hemen güncelle
    setQuery(nextQuery);

    const next = new URLSearchParams();
    safeAbstracts.forEach((a) => next.append("abstract", a));
    if (safeKeywords.length) next.set("keywords", safeKeywords.join(","));
    next.set("page", "1");
    setParams(next);

    setLoading(true);
    setError("");
    searchPapersPOST({ abstracts: safeAbstracts, keywords: safeKeywords, page: 1, per_page: 30 })
      .then((res) => {
        setRequest(nextQuery);
        setData(res);
        sessionStorage.setItem("lastSearch", JSON.stringify({ request: nextQuery, data: res }));
      })
      .catch((e) => setError(e.message || "Search failed"))
      .finally(() => setLoading(false));

    // Trigger fresh raw OpenAlex keyword search as well (only when evaluation flag is on)
    if (SHOW_EVAL && safeKeywords.length) {
      searchOpenAlexKeywordPOST({ keywords: safeKeywords, per_page: 30 })
        .then((raw) => setOpenAlexData(raw))
        .catch((e) => {
          console.warn("OpenAlex keyword search failed:", e);
          setOpenAlexData(null);
        });
    } else {
      setOpenAlexData(null);
    }

    // Trigger Gemini+user keywords OpenAlex search for 3rd column (needs both abstracts and keywords)
    if (SHOW_EVAL && safeAbstracts.length && safeKeywords.length) {
      searchOpenAlexGeminiPOST({
        abstracts: safeAbstracts,
        keywords: safeKeywords,
        per_page: 30,
      })
        .then((raw) => setOpenAlexGeminiData(raw))
        .catch((e) => {
          console.warn("OpenAlex Gemini keyword search failed:", e);
          setOpenAlexGeminiData(null);
        });
    } else {
      setOpenAlexGeminiData(null);
    }
  };

  const queryParamsForSubscription = useMemo(() => {
  // Öncelik backend'in gönderdiği query_summary'de
  if (data?.query_summary) {
    return {
      abstracts: data.query_summary.abstracts || request?.abstracts || [],
      keywords: data.query_summary.keywords || request?.keywords || [],
    };
  }

  // Eğer query_summary yoksa, en azından request'i kullan
  if (request) {
    return {
      abstracts: request.abstracts || [],
      keywords: request.keywords || [],
    };
  }

  // Hiçbiri yoksa boş
  return { abstracts: [], keywords: [] };
}, [data, request]);


  // Apply sort only (used when not in eval mode). Returns a new sorted array.
  const applySortOnly = (items) => {
    if (!items || !items.length) return [];
    const out = items.slice();
    out.sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sortBy === "similarity") {
        const aArr = a.per_abstract_sims || [];
        const bArr = b.per_abstract_sims || [];
        va = aArr.length ? (aArr.reduce((x, y) => x + y, 0) / aArr.length) * 100 : 0;
        vb = bArr.length ? (bArr.reduce((x, y) => x + y, 0) / bArr.length) * 100 : 0;
      } else if (sortBy === "year") {
        va = a.year || 0;
        vb = b.year || 0;
      } else if (sortBy === "citations") {
        va = a.cited_by_count || 0;
        vb = b.cited_by_count || 0;
      } else if (sortBy === "references") {
        va = a.references_count || 0;
        vb = b.references_count || 0;
      }
      if (va === vb) return 0;
      return sortDirDesc ? vb - va : va - vb;
    });
    return out;
  };

  return (
    <div style={{display:"grid", gap:24}}>
      <QuerySummary
        query={query}
        // Eval modu açıkken global sonuç sayısını gizle, ama similarity metnini göstermeye devam et
        resultCount={SHOW_EVAL ? 0 : (data?.count ?? 0)}
        summary={data?.query_summary}
        onQueryUpdate={handleQueryUpdate}
        onSubscribeClick={() => setSubscribeOpen(true)}
      />
        {/* Sort controls (client-side). Only show when evaluation mode is OFF. */}
        {!SHOW_EVAL && (
          <div className="card sort-bar" style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            {/* Label at the start */}
            <div className="sort-label">Sort by:</div>

            {/* Field selector: what we sort by */}
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Choose sort field">
              <option value="similarity">Similarity</option>
              <option value="year">Year</option>
              <option value="citations">Citations</option>
              <option value="references">References</option>
            </select>

            {/* Desc/Asc toggle: arrow + short visible label, animated rotation */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSortDirDesc((v) => !v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSortDirDesc(v => !v); } }}
              className={`sort-pill ${sortDirDesc ? 'desc active' : 'asc'}`}
              aria-pressed={sortDirDesc}
              title={`${mapSortLabel(sortBy)} — ${sortDirDesc ? 'Descending' : 'Ascending'} `}
            >
              <span className="arrow" aria-hidden>
                <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              {/* visible short label indicating direction */}
              <span className="sort-dir-label">{sortDirDesc ? 'Desc' : 'Asc'}</span>
              {/* screen-reader text for the selected field */}
              <span className="sr-only">{mapSortLabel(sortBy)}</span>
            </div>
          </div>
        )}
        {/* Normal modda tek sütun; eval modda aşağıdaki üçlü layout gösterilecek */}
      {!SHOW_EVAL && (
        (() => {
          const sorted = applySortOnly(data?.results || []);
          return (
            <SearchResultsList
              results={sorted}
              loading={loading}
              error={error}
              hideSimilarity={false}
            />
          );
        })()
      )}


    {SHOW_EVAL ? (
      !allReady ? (
        <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
          Loading all result sets…
        </div>
      ) : (
		<div className="grid gap-y-8 gap-x-4 md:grid-cols-3">
          {/* Left column */}
          <div>
            <SearchResultsList
              results={
                layout.left === "embedding"
                  ? data?.results || []
                  : layout.left === "raw_openalex"
                  ? openAlexData?.results || []
                  : openAlexGeminiData?.results || []
              }
              loading={false}
              error={error}
              hideSimilarity={SHOW_EVAL}
              compact={SHOW_EVAL}
            />
          </div>

          {/* Middle column */}
          <div>
            <SearchResultsList
              results={
                layout.middle === "embedding"
                  ? data?.results || []
                  : layout.middle === "raw_openalex"
                  ? openAlexData?.results || []
                  : openAlexGeminiData?.results || []
              }
              loading={false}
              error={error}
              hideSimilarity={SHOW_EVAL}
              compact={SHOW_EVAL}
            />
          </div>

          {/* Right column */}
          <div>
            <SearchResultsList
              results={
                layout.right === "embedding"
                  ? data?.results || []
                  : layout.right === "raw_openalex"
                  ? openAlexData?.results || []
                  : openAlexGeminiData?.results || []
              }
              loading={false}
              error={error}
              hideSimilarity={SHOW_EVAL}
              compact={SHOW_EVAL}
            />
          </div>
        </div>
      )
      ) : (
        <SearchResultsList results={data?.results || []} loading={loading} error={error} />
      )}

      {SHOW_EVAL && data && openAlexData && (
        <EvalFeedback onSubmit={handleEvalSubmit} submitting={evalSubmitting} />
      )}

      {data && (
        <div style={{marginTop:8, display:"flex", gap:12}}>
          {data.previous && (
            <button className="btn-ghost" onClick={() => gotoPage(page - 1)}>
              Previous
            </button>
          )}
          {data.next && (
            <button className="btn-ghost" onClick={() => gotoPage(page + 1)}>
              Next
            </button>
          )}
        </div>
      )}
      
    {/* ⭐️ Modal tek bir yerde, tüm sayfa için ortak */}
    <SubscribeModal
      isOpen={subscribeOpen}
      onClose={() => setSubscribeOpen(false)}
      initialQueryName={data?.query_summary?.query_name || "Saved search"}
      queryParams={queryParamsForSubscription}
    />

      
    </div>



  );
}
