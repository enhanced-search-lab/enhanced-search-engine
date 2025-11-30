import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import QuerySummary from "../components/QuerySummary";
import SearchResultsList from "../components/SearchResultsList";
import { searchPapersPOST } from "../services/api";

export default function SearchPage() {

  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const boot =
    location.state ??
    (sessionStorage.getItem("lastSearch")
      ? JSON.parse(sessionStorage.getItem("lastSearch"))
      : null);

  const [request, setRequest] = useState(boot?.request ?? null);
  const [data, setData] = useState(boot?.data ?? null);
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
    searchPapersPOST({ ...queryFromURL, page, per_page: 12 })
      .then((res) => {
        setRequest(queryFromURL);
        setData(res);
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
      searchPapersPOST({ ...request, page: p, per_page: 12 })
        .then((res) => {
          setData(res);
          sessionStorage.setItem("lastSearch", JSON.stringify({ request, data: res }));
        })
        .finally(() => setLoading(false));
    }
  };

  const handleQueryUpdate = ({ abstracts, keywords }) => {
    const next = new URLSearchParams();
    (abstracts || []).forEach((a) => next.append("abstract", a));
    if (keywords?.length) next.set("keywords", keywords.join(","));
    next.set("page", "1");
    setParams(next);

    setLoading(true);
    searchPapersPOST({ abstracts: abstracts || [], keywords: keywords || [], page: 1, per_page: 12 })
      .then((res) => {
        const req = { abstracts: abstracts || [], keywords: keywords || [] };
        setRequest(req);
        setData(res);
        sessionStorage.setItem("lastSearch", JSON.stringify({ request: req, data: res }));
      })
      .finally(() => setLoading(false));
  };

  const q = request || queryFromURL || { abstracts: [], keywords: [] };

  return (
    <div style={{display:"grid", gap:24}}>
      <QuerySummary
        query={q}
        resultCount={data?.count ?? 0}
        summary={data?.query_summary}
        onQueryUpdate={handleQueryUpdate}
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
    </div>
  );
}
