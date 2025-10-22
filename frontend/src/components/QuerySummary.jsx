import React, { useState } from 'react';
import EditQueryModal from './modals/EditQueryModal';
import SubscribeModal from './modals/SubscribeModal';
import ClampedText from './common/ClampedText';

const QuerySummary = ({ query, resultCount, onQueryUpdate }) => {
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isSubscribeModalOpen, setSubscribeModalOpen] = useState(false);

    const { abstracts = [], keywords = [] } = query;

    return (
        <>
            <section className="py-8 text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-end items-center mb-6 gap-2">
                        <button
                            onClick={() => setEditModalOpen(true)}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium backdrop-blur-sm border border-white/30"
                        >
                            Edit query
                        </button>
                        <button
                            onClick={() => setSubscribeModalOpen(true)}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium shadow-lg"
                        >
                            Subscribe to this query
                        </button>
                    </div>
                    <div className="w-full max-w-5xl mx-auto">
                        {abstracts.length > 0 && (
                            <>
                                <h2 className="text-white/90 font-semibold mb-3">Abstracts</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {abstracts.map((abs, i) => (
                                        <div key={i} className="bg-white/10 rounded-lg p-4 border border-white/20">
                                            <div className="text-xs text-white/70 mb-1">Abstract #{i + 1}</div>
                                            <ClampedText text={abs} limit={180} className="text-white/90 text-sm leading-relaxed" linkClassName="text-white/90 underline" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {keywords.length > 0 && (
                            <>
                                <h2 className="text-white/90 font-semibold mb-2 mt-8">Keywords</h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {keywords.map(kw => (
                                        <span key={kw} className="text-white text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="text-center mt-6">
                        <p className="text-white/75 text-sm mt-1">{resultCount ? `Showing 1-10 of ${resultCount.toLocaleString()} results` : 'Loading results...'}</p>
                        <p className="text-white/70 text-xs mt-1">
                            Search simulated with {abstracts.length} abstract{abstracts.length !== 1 && 's'} and {keywords.length} keyword{keywords.length !== 1 && 's'}.
                        </p>
                    </div>
                </div>
            </section>

            <EditQueryModal
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                currentQuery={query}
                onApply={onQueryUpdate}
            />
            <SubscribeModal
                isOpen={isSubscribeModalOpen}
                onClose={() => setSubscribeModalOpen(false)}
            />
        </>
    );
};

export default QuerySummary;
