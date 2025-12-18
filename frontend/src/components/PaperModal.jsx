import React, { useEffect } from 'react';

const PaperModal = ({ paper, onClose }) => {
    // Effect to handle 'Escape' key press for closing the modal
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    // Effect to lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!paper) return null;

    const authors = (paper.authors || []).join(', ');

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform animate-slide-up"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-10"
                    aria-label="Close modal"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <div className="p-8 md:p-12">
                    {/* Header Section */}
                    <div className="pb-6 border-b border-gray-200">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
                            <a href={paper.link} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">
                                {paper.title}
                            </a>
                        </h2>
                        <div className="text-base text-gray-600">
                            <p className="font-medium">{authors || 'Unknown authors'}</p>
                            <p className="mt-1">{paper.venue || 'Unknown venue'}, {paper.year || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 text-center">
                        <div>
                            <div className="text-2xl font-bold text-purple-600">
                                {paper.per_abstract_sims && paper.per_abstract_sims.length > 0
                                    ? `${(
                                        (paper.per_abstract_sims.reduce((a, b) => a + b, 0) /
                                            paper.per_abstract_sims.length) * 100
                                      ).toFixed(2)}%`
                                    : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Ortalama Benzerlik</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600">{paper.cited?.toLocaleString() || 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Citations</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-600">{paper.refs?.toLocaleString() || 0}</div>
                            <div className="text-sm text-gray-500 mt-1">References</div>
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${paper.oa ? 'text-green-500' : 'text-gray-400'}`}>{paper.oa ? 'Yes' : 'No'}</div>
                            <div className="text-sm text-gray-500 mt-1">Open Access</div>
                        </div>
                    </div>

                    {/* Keywords Section - MOVED UP */}
                    {paper.keywords && paper.keywords.length > 0 && (
                        <div className="pt-6 mt-6 border-t border-gray-200">
                            <h4 className="text-xl font-semibold text-gray-800 mb-4" title="Keywords — terms associated with the paper">Keywords</h4>
                            <div className="flex flex-wrap gap-3">
                                {paper.keywords.map((keyword, index) => (
                                    <span key={index} className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-100 hover:text-purple-700 transition-colors cursor-default">
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Abstract Section - MOVED DOWN */}
                    <div className="pt-6 mt-6 border-t border-gray-200">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4" title="Paper abstract">Abstract</h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{paper.abstract || 'No abstract available.'}</p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PaperModal;
