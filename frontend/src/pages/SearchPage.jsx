// import React, { useState, useEffect, useMemo } from 'react';
// import { useSearchParams, createSearchParams } from 'react-router-dom';
// import SearchResultsList from '../components/SearchResultsList';
// import QuerySummary from '../components/QuerySummary';
// import { searchPapers } from '../services/api';

// const SearchPage = () => {
//     const [searchParams, setSearchParams] = useSearchParams();
    
//     // Query parametrelerini hala okuyoruz, ancak searchPapers fonksiyonu bunları artık kullanmayacak.
//     const query = useMemo(() => {
//         const abstracts = searchParams.getAll('abstract') || [];
//         const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
//         return { abstracts, keywords };
//     }, [searchParams]);

//     const [results, setResults] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         window.scrollTo(0, 0);
//         const performSearch = async () => {
//             // Kullanıcının isteği üzerine, artık boş sorgu kontrolü yapmıyoruz.
//             // Her zaman mock verilerini göstereceğiz.

//             try {
//                 setLoading(true);
//                 setError(null);
//                 // searchPapers fonksiyonu artık query parametresini dikkate almayacak.
//                 const data = await searchPapers(query); 
//                 setResults(data);
//             } catch (err) {
//                 setError(err.message || "An unexpected error occurred.");
//             } finally {
//                 setLoading(false);
//             }
//         };

//         performSearch();
//     }, [query]); // query değiştiğinde yine de aramayı tetikleyebiliriz, ancak sonuç değişmeyecek.

//     const handleQueryUpdate = (newQuery) => {
//         const params = {};
//         if (newQuery.abstracts?.length) {
//             params.abstract = newQuery.abstracts;
//         }
//         if (newQuery.keywords?.length) {
//             params.keywords = newQuery.keywords.join(',');
//         }
//         setSearchParams(createSearchParams(params));
//     };

//     return (
//         <div className="bg-gray-50 min-h-full">
//             <QuerySummary 
//                 query={query} 
//                 resultCount={results.length}
//                 onQueryUpdate={handleQueryUpdate}
//             />
//             <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//                 <SearchResultsList results={results} loading={loading} error={error} />
//             </main>
//         </div>
//     );
// };

// export default SearchPage;
// src/pages/SearchPage.jsx
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { searchPapersPOST } from "../services/api";

export default function SearchPage() {
  const { state } = useLocation(); // abstracts, keywords passed from SearchForm
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ results: [], count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // page from URL so you can paginate without losing state
  const page = Number(params.get("page") || 1);

  useEffect(() => {
    const abstracts = state?.abstracts || [];
    const keywords  = state?.keywords  || [];

    if (!abstracts.length && !keywords.length) {
      setError("No search inputs provided.");
      return;
    }
    setLoading(true);
    setError("");

    searchPapersPOST({ abstracts, keywords, page, per_page: 12 })
      .then((res) => setData(res))
      .catch((e) => setError(e.message || "Search failed"))
      .finally(() => setLoading(false));
  }, [state, page]);

  const gotoPage = (p) => setParams({ page: String(p) });

  if (error)   return <div className="p-6 text-red-600">{error}</div>;
  if (loading) return <div className="p-6">Searching…</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Results ({data.count})</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.results.map((p) => (
          <div key={p.id} className="p-4 rounded-xl border bg-white">
            <div className="font-semibold">{p.title}</div>
            <div className="text-sm text-gray-600">
              {p.venue} {p.year ? `• ${p.year}` : ""}
            </div>
            <p className="mt-2 line-clamp-3 text-gray-700">
              {typeof p.abstract === "string" ? p.abstract : "(abstract available)"}
            </p>
            {p.url && (
              <a className="text-indigo-600 text-sm mt-2 inline-block" href={p.url} target="_blank" rel="noreferrer">
                View source
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex gap-3 mt-6">
        {data.previous && <button className="btn" onClick={() => gotoPage(page - 1)}>Previous</button>}
        {data.next &&     <button className="btn" onClick={() => gotoPage(page + 1)}>Next</button>}
      </div>
    </div>
  );
}

