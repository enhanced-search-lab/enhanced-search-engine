import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import QuerySummary from "../components/QuerySummary";
import SearchResultsList from "../components/SearchResultsList";
import SubscribeModal from "../components/modals/SubscribeModal";
import EvalFeedback from "../components/EvalFeedback";
import GameModal from "../components/GameModal";
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
  // When eval is on, hold the embedding response in a pending slot and only
  // commit it to `data` once the OpenAlex sets are also available so all
  // three columns render at the same time.
  const [pendingData, setPendingData] = useState(null);
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

  // Year filter UI state (strings for easy binding)
  const [yearMin, setYearMin] = useState(() => {
    const v = params.get("year_min");
    return v ? String(v) : "";
  });
  const [yearMax, setYearMax] = useState(() => {
    const v = params.get("year_max");
    return v ? String(v) : "";
  });

  const queryFromURL = useMemo(() => {
    const abstracts = params.getAll("abstract");
    const keywords = (params.get("keywords") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const year_min = params.get("year_min");
    const year_max = params.get("year_max");
    return {
      abstracts,
      keywords,
      year_min: year_min ? Number(year_min) : null,
      year_max: year_max ? Number(year_max) : null,
    };
  }, [params]);

  const page = Number(params.get("page") || 1);

  // Dedupe + stale-response guards for async requests
  const lastEmbeddingKeyRef = useRef(null);
  const lastOpenAlexKeyRef = useRef(null);
  const lastGeminiKeyRef = useRef(null);
  const embeddingReqIdRef = useRef(0);
  const openAlexReqIdRef = useRef(0);
  const geminiReqIdRef = useRef(0);

  const makeKey = (obj) => {
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  };

  useEffect(() => {
    const { abstracts, keywords, year_min, year_max } = queryFromURL;
    if (!abstracts.length && !keywords.length) return;

    // Keep UI query summary in sync with URL even before results arrive
    setQuery(queryFromURL);
    setRequest(queryFromURL);

    // 1) Main embedding-based search (paged)
    const embeddingKey = makeKey({ abstracts, keywords, year_min, year_max, page });
    if (lastEmbeddingKeyRef.current !== embeddingKey) {
      lastEmbeddingKeyRef.current = embeddingKey;
      const reqId = ++embeddingReqIdRef.current;

      // Clear any previous pending/committed results so UI shows unified loading
      setPendingData(null);
      setData(null);
      setError("");
      setLoading(true);

      console.log("SearchPage: starting embedding search", { queryFromURL, page });
      searchPapersPOST({ abstracts, keywords, year_min, year_max, page, per_page: 30 })
        .then((res) => {
          if (reqId !== embeddingReqIdRef.current) return;
          console.log("SearchPage: embedding response received", res?.results?.length, res);
          setPendingData(res);
          sessionStorage.setItem("lastSearch", JSON.stringify({ request: queryFromURL, data: res }));
        })
        .catch((e) => {
          if (reqId !== embeddingReqIdRef.current) return;
          console.warn("SearchPage: embedding search failed", e);
          setError(e.message || "Search failed");
        })
        .finally(() => {
          if (reqId !== embeddingReqIdRef.current) return;
          setLoading(false);
        });
    }

    // 2) Raw keyword-only OpenAlex search (eval mode, not paged)
    if (SHOW_EVAL && keywords && keywords.length) {
      const openAlexKey = makeKey({ keywords, year_min, year_max });
      if (lastOpenAlexKeyRef.current !== openAlexKey) {
        lastOpenAlexKeyRef.current = openAlexKey;
        const reqId = ++openAlexReqIdRef.current;
        setOpenAlexData(null);
        setLoadingOpenAlex(true);
        console.log("SearchPage: starting OpenAlex keyword search", keywords);
        searchOpenAlexKeywordPOST({ keywords, per_page: 30, year_min, year_max })
          .then((raw) => {
            if (reqId !== openAlexReqIdRef.current) return;
            console.log("SearchPage: OpenAlex keyword response", raw?.results?.length, raw);
            setOpenAlexData(raw);
          })
          .catch((e) => {
            if (reqId !== openAlexReqIdRef.current) return;
            console.warn("OpenAlex keyword search failed:", e);
            setOpenAlexData(null);
          })
          .finally(() => {
            if (reqId !== openAlexReqIdRef.current) return;
            setLoadingOpenAlex(false);
          });
      }
    } else {
      lastOpenAlexKeyRef.current = null;
      setOpenAlexData(null);
      setLoadingOpenAlex(false);
    }

    // 3) Gemini+user keywords OpenAlex search (eval mode, not paged)
    if (SHOW_EVAL && abstracts && abstracts.length && keywords && keywords.length) {
      const geminiKey = makeKey({ abstracts, keywords, year_min, year_max });
      if (lastGeminiKeyRef.current !== geminiKey) {
        lastGeminiKeyRef.current = geminiKey;
        const reqId = ++geminiReqIdRef.current;
        setOpenAlexGeminiData(null);
        setLoadingGemini(true);
        console.log("SearchPage: starting OpenAlex Gemini search");
        searchOpenAlexGeminiPOST({ abstracts, keywords, per_page: 30, year_min, year_max })
          .then((raw) => {
            if (reqId !== geminiReqIdRef.current) return;
            console.log("SearchPage: OpenAlex Gemini response", raw?.results?.length, raw);
            setOpenAlexGeminiData(raw);
          })
          .catch((e) => {
            if (reqId !== geminiReqIdRef.current) return;
            console.warn("OpenAlex Gemini keyword search failed:", e);
            setOpenAlexGeminiData(null);
          })
          .finally(() => {
            if (reqId !== geminiReqIdRef.current) return;
            setLoadingGemini(false);
          });
      }
    } else {
      lastGeminiKeyRef.current = null;
      setOpenAlexGeminiData(null);
      setLoadingGemini(false);
    }
  }, [queryFromURL, page]);

  // Commit pending embedding result to `data` only when all required eval sets are present.
  useEffect(() => {
    if (!pendingData) return;

    // Determine whether raw OpenAlex and Gemini results are required
    const requiresOpenAlex = SHOW_EVAL && (queryFromURL.keywords || []).length > 0;
    const requiresGemini = SHOW_EVAL && (queryFromURL.abstracts || []).length > 0 && (queryFromURL.keywords || []).length > 0;

    // Treat completion (loading flag false) as "ready" even if the request failed and data is null,
    // so eval mode cannot get stuck forever.
    const openAlexReady = !requiresOpenAlex || !loadingOpenAlex;
    const geminiReady = !requiresGemini || !loadingGemini;

    if (openAlexReady && geminiReady) {
      setData(pendingData);
      setPendingData(null);
    }
  }, [pendingData, loadingOpenAlex, loadingGemini, queryFromURL]);

  // Tüm ilgili sütunlar (geçerli oldukları durumda) hazır mı?
  const abstracts = queryFromURL.abstracts;
  const keywords = queryFromURL.keywords;

  const allReady =
    !!data &&
    (!SHOW_EVAL || !keywords.length || !loadingOpenAlex) &&
    (!SHOW_EVAL || !abstracts.length || !keywords.length || !loadingGemini);

  const gotoPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
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

  const handleQueryUpdate = (newQuery) => {
    console.log("SearchPage.handleQueryUpdate called with:", newQuery);
    const safeAbstracts = (newQuery && newQuery.abstracts) || [];
    const safeKeywords = (newQuery && newQuery.keywords) || [];

    // If the editor provided explicit year bounds, sync local inputs
    if (newQuery && typeof newQuery.year_min !== 'undefined') {
      setYearMin(newQuery.year_min ? String(newQuery.year_min) : '');
    }
    if (newQuery && typeof newQuery.year_max !== 'undefined') {
      setYearMax(newQuery.year_max ? String(newQuery.year_max) : '');
    }

    const nextQuery = { abstracts: safeAbstracts, keywords: safeKeywords };
    if (newQuery && typeof newQuery.year_min !== 'undefined') nextQuery.year_min = newQuery.year_min;
    if (newQuery && typeof newQuery.year_max !== 'undefined') nextQuery.year_max = newQuery.year_max;

    // QuerySummary'de gösterilen metni sonuç beklemeden hemen güncelle
    setQuery(nextQuery);

    // Clear previous results so the UI shows a unified loading state
    // In eval mode we want to wait for all three result sets before rendering.
    setPendingData(null);
    setData(null);
    setOpenAlexData(null);
    setOpenAlexGeminiData(null);
    setError("");

    // Build URL params (prefer explicit years from nextQuery, otherwise local inputs)
    const next = new URLSearchParams();
    safeAbstracts.forEach((a) => next.append("abstract", a));
    if (safeKeywords.length) next.set("keywords", safeKeywords.join(","));
    next.set("page", "1");

    if (typeof nextQuery.year_min !== 'undefined') {
      if (nextQuery.year_min) next.set('year_min', String(nextQuery.year_min)); else next.delete('year_min');
    } else {
      if (yearMin) next.set('year_min', String(yearMin)); else next.delete('year_min');
    }
    if (typeof nextQuery.year_max !== 'undefined') {
      if (nextQuery.year_max) next.set('year_max', String(nextQuery.year_max)); else next.delete('year_max');
    } else {
      if (yearMax) next.set('year_max', String(yearMax)); else next.delete('year_max');
    }
    setParams(next);
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

  // Any in-progress request across embedding/OpenAlex/Gemini
  const anyLoading = loading || loadingOpenAlex || loadingGemini;
  const [gameDismissed, setGameDismissed] = useState(false);
  const prevAnyLoadingRef = useRef(false);

  // When loading begins (transition false -> true), reset dismissed state so modal can show
  useEffect(() => {
    if (anyLoading && !prevAnyLoadingRef.current) {
      setGameDismissed(false);
    }
    prevAnyLoadingRef.current = anyLoading;
  }, [anyLoading]);

  return (
    <div style={{display:"grid", gap:24}}>
      <GameModal open={anyLoading && !allReady && !gameDismissed} onClose={() => setGameDismissed(true)} loading={anyLoading && !allReady} />
      <QuerySummary
        query={query}
        // Eval modu açıkken global sonuç sayısını gizle, ama similarity metnini göstermeye devam et
        resultCount={SHOW_EVAL ? 0 : (data?.count ?? 0)}
        // When not in eval mode, render the summary as if per_page is 12 so the
        // "Showing 1-12 of N" text matches the number of items we display below.
        summary={SHOW_EVAL ? data?.query_summary : { ...(data?.query_summary || {}), per_page: 12 }}
        onQueryUpdate={handleQueryUpdate}
        onSubscribeClick={() => setSubscribeOpen(true)}
      />
        {/* Sort controls (client-side). Only show when evaluation mode is OFF. */}
        {!SHOW_EVAL && (
          <div className="card sort-bar" style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            {/* Label at the start */}
            <div className="sort-label" title="Choose how results are ordered">Sort by:</div>

            {/* Field selector: what we sort by */}
            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Choose sort field" title="Choose sort field">
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
          // Show 12 items in compact/non-eval mode to match user's preference.
          const display = (sorted || []).slice(0, 12);
          return (
            <SearchResultsList
              results={display}
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
                  ? (data?.results || []).slice(0, 20)
                  : layout.left === "raw_openalex"
                  ? (openAlexData?.results || []).slice(0, 20)
                  : (openAlexGeminiData?.results || []).slice(0, 20)
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
                  ? (data?.results || []).slice(0, 20)
                  : layout.middle === "raw_openalex"
                  ? (openAlexData?.results || []).slice(0, 20)
                  : (openAlexGeminiData?.results || []).slice(0, 20)
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
                  ? (data?.results || []).slice(0, 20)
                  : layout.right === "raw_openalex"
                  ? (openAlexData?.results || []).slice(0, 20)
                  : (openAlexGeminiData?.results || []).slice(0, 20)
              }
              loading={false}
              error={error}
              hideSimilarity={SHOW_EVAL}
              compact={SHOW_EVAL}
            />
          </div>
        </div>
      )
      ) : null}

      {SHOW_EVAL && data && openAlexData && (
        <EvalFeedback onSubmit={handleEvalSubmit} submitting={evalSubmitting} />
      )}

      {data && (
        <div style={{marginTop:8, display:"flex", gap:12}}>
          {data.previous && (
            <button className="btn-ghost" title="Go to previous page of results" onClick={() => gotoPage(page - 1)}>
              Previous
            </button>
          )}
          {data.next && (
            <button className="btn-ghost" title="Go to next page of results" onClick={() => gotoPage(page + 1)}>
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
