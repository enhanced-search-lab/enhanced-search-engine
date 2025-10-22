import React from 'react';
import ClampedText from './common/ClampedText';

const LoadingSkeleton = () => (
    <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                <div className="bg-gray-200 h-6 w-3/4 mb-4 rounded"></div>
                <div className="bg-gray-200 h-4 w-1/2 mb-3 rounded"></div>
                <div className="bg-gray-200 h-4 w-full mb-2 rounded"></div>
                <div className="bg-gray-200 h-4 w-full mb-2 rounded"></div>
                <div className="bg-gray-200 h-4 w-2/3 rounded"></div>
            </div>
        ))}
    </div>
);

const ErrorDisplay = ({ message, onRetry }) => (
    <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-red-800 mb-2">Search Failed</h3>
            <p className="text-red-600 mb-4">{message}</p>
            <button onClick={onRetry} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Retry Search
            </button>
        </div>
    </div>
);

const PaperCard = ({ paper }) => {
    const authors = (paper.authors || []).slice(0, 5).join(', ') + ((paper.authors || []).length > 5 ? ` et al.` : '');

    return (
        <div className="paper-card bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
                        <a href={paper.link} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                            {paper.title}
                        </a>
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{authors || 'Unknown authors'}</span>
                        <span className="mx-2">•</span>
                        <span>{paper.year || '—'}</span>
                        <span className="mx-2">•</span>
                        <span className="italic">{paper.venue || '—'}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    <div className="text-white text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        {Math.round((paper.rel || 0) * 100)}%
                    </div>
                    {paper.oa && (
                        <div className="text-white text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                            Open Access
                        </div>
                    )}
                </div>
            </div>

            <ClampedText text={paper.abstract} limit={280} className="text-gray-700 mb-4 leading-relaxed" linkClassName="text-indigo-700 underline" />

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>💬 {paper.cited?.toLocaleString() || 0} citations</span>
                    <span>📚 {paper.refs?.toLocaleString() || 0} references</span>
                </div>
            </div>
        </div>
    );
};

const SearchResultsList = ({ results, loading, error }) => {
    if (loading) return <LoadingSkeleton />;
    if (error) return <ErrorDisplay message={error} />;
    if (!results.length) return <p className="text-center text-gray-500 mt-8">No results found for your query.</p>;

    return (
        <div className="space-y-6">
            {results.map(paper => <PaperCard key={paper.id} paper={paper} />)}
        </div>
    );
};

export default SearchResultsList;
