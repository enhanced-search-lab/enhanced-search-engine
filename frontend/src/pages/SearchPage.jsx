import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, createSearchParams } from 'react-router-dom';
import SearchResultsList from '../components/SearchResultsList';
import QuerySummary from '../components/QuerySummary';
import { searchPapers } from '../services/api';

const SearchPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Query parametrelerini hala okuyoruz, ancak searchPapers fonksiyonu bunları artık kullanmayacak.
    const query = useMemo(() => {
        const abstracts = searchParams.getAll('abstract') || [];
        const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
        return { abstracts, keywords };
    }, [searchParams]);

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const performSearch = async () => {
            // Kullanıcının isteği üzerine, artık boş sorgu kontrolü yapmıyoruz.
            // Her zaman mock verilerini göstereceğiz.

            try {
                setLoading(true);
                setError(null);
                // searchPapers fonksiyonu artık query parametresini dikkate almayacak.
                const data = await searchPapers(query); 
                setResults(data);
            } catch (err) {
                setError(err.message || "An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        };

        performSearch();
    }, [query]); // query değiştiğinde yine de aramayı tetikleyebiliriz, ancak sonuç değişmeyecek.

    const handleQueryUpdate = (newQuery) => {
        const params = {};
        if (newQuery.abstracts?.length) {
            params.abstract = newQuery.abstracts;
        }
        if (newQuery.keywords?.length) {
            params.keywords = newQuery.keywords.join(',');
        }
        setSearchParams(createSearchParams(params));
    };

    return (
        <div className="bg-gray-50 min-h-full">
            <QuerySummary 
                query={query} 
                resultCount={results.length}
                onQueryUpdate={handleQueryUpdate}
            />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <SearchResultsList results={results} loading={loading} error={error} />
            </main>
        </div>
    );
};

export default SearchPage;
