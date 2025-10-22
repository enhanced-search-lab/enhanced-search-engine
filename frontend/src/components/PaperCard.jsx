import React, { useState } from 'react';

const PaperCard = ({ paper }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const authors = (paper.authors || []).slice(0, 5).join(', ') + ((paper.authors || []).length > 5 ? ` and ${(paper.authors || []).length - 5} more` : '');
    
    const clampText = (text, maxLength = 250) => {
        if (!text) return { short: 'No abstract available.', full: '' };
        if (text.length <= maxLength) return { short: text, full: '' };
        return { short: text.slice(0, maxLength) + '…', full: text };
    };

    const { short, full } = clampText(paper.abstract);

    return (
        <div className="paper-card bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
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
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{Math.round((paper.rel || 0) * 100)}%</div>
                    {paper.oa && <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">Open Access</div>}
                </div>
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">
                {isExpanded ? full : short}
                {full && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-indigo-600 hover:text-indigo-800 font-semibold ml-2">
                        {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>💬 {paper.cited?.toLocaleString() || 0} citations</span>
                    <span>📚 {paper.refs?.toLocaleString() || 0} references</span>
                </div>
            </div>
        </div>
    );
};

export default PaperCard;
