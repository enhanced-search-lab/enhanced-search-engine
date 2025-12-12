import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import QuerySummary from "../components/QuerySummary";
import SearchResultsList from "../components/SearchResultsList";
import { searchPapersPOST } from "../services/api";
import SubscribeModal from "../components/modals/SubscribeModal";

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
  const [query, setQuery] = useState(boot?.request ?? { abstracts: [], keywords: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (request && data) return;

    const { abstracts, keywords } = queryFromURL;
    if (!abstracts.length && !keywords.length) return;

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
  }, [request, data, queryFromURL, page]);

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


  return (
    <div style={{display:"grid", gap:24}}>
      <QuerySummary
        query={query}
        resultCount={data?.count ?? 0}
        summary={data?.query_summary}
        onQueryUpdate={handleQueryUpdate}
        onSubscribeClick={() => setSubscribeOpen(true)}
      />
      <SearchResultsList results={data?.results || []} loading={loading} error={error} />

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
