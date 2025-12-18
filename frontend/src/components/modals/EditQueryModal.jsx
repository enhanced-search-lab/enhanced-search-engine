import React, { useState, useEffect } from 'react';

const KeywordChip = ({ keyword, onRemove }) => (
    <span className="chip inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-1 px-3 rounded-full text-xs font-medium">
        {keyword}
        <button onClick={() => onRemove(keyword)} className="ml-2 text-white opacity-70 hover:opacity-100 text-lg leading-none transform hover:scale-110">
            &times;
        </button>
    </span>
);

const EditQueryModal = ({ isOpen, onClose, currentQuery, onApply }) => {
    const [abstracts, setAbstracts] = useState(['']);
    const [keywords, setKeywords] = useState([]);
    const [yearMin, setYearMin] = useState('');
    const [yearMax, setYearMax] = useState('');
    const [yearError, setYearError] = useState('');
    const [isYearValid, setIsYearValid] = useState(true);
    const [keywordInput, setKeywordInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAbstracts(currentQuery.abstracts?.length ? [...currentQuery.abstracts] : ['']);
            setKeywords(currentQuery.keywords ? [...currentQuery.keywords] : []);
            setYearMin(currentQuery.year_min != null ? String(currentQuery.year_min) : '');
            setYearMax(currentQuery.year_max != null ? String(currentQuery.year_max) : '');
        }
    }, [isOpen, currentQuery]);

    // Live validation for year inputs
    useEffect(() => {
        setYearError('');
        setIsYearValid(true);
        const curYear = new Date().getFullYear();
        const minVal = yearMin !== '' ? Number(yearMin) : null;
        const maxVal = yearMax !== '' ? Number(yearMax) : null;

        if (minVal !== null && (Number.isNaN(minVal) || minVal < 1900 || minVal > curYear)) {
            setYearError(`Min year must be between 1900 and ${curYear}`);
            setIsYearValid(false);
            return;
        }
        if (maxVal !== null && (Number.isNaN(maxVal) || maxVal < 1900 || maxVal > curYear)) {
            setYearError(`Max year must be between 1900 and ${curYear}`);
            setIsYearValid(false);
            return;
        }
        if (minVal !== null && maxVal !== null && minVal > maxVal) {
            setYearError('Min year cannot be greater than max year');
            setIsYearValid(false);
            return;
        }
    }, [yearMin, yearMax]);

    if (!isOpen) return null;

    const handleAddAbstract = () => setAbstracts(prev => ['', ...prev]);
    const handleRemoveAbstract = (index) => setAbstracts(prev => prev.filter((_, i) => i !== index));
    const handleAbstractChange = (index, value) => {
        const newAbstracts = [...abstracts];
        newAbstracts[index] = value;
        setAbstracts(newAbstracts);
    };

    const handleKeywordKeyDown = (e) => {
        if (e.key === 'Enter' && keywordInput.trim()) {
            e.preventDefault();
            const newKeyword = keywordInput.trim();
            setKeywords([...keywords, newKeyword]);
            setKeywordInput('');
        }
    };
    const removeKeyword = (kw) => setKeywords(prev => prev.filter(k => k !== kw));

    const handleApply = () => {
        const updatedQuery = {
            abstracts: abstracts.map(a => a.trim()).filter(Boolean),
            keywords: keywords,
            // Return explicit null when empty so caller can distinguish "cleared" vs "not-provided".
            year_min: yearMin ? Number(yearMin) : null,
            year_max: yearMax ? Number(yearMax) : null,
        };
        onApply(updatedQuery);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50" onClick={onClose}>
            <div className="modal-backdrop fixed inset-0"></div>
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div className="modal-in bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit your query</h3>
                    <p className="text-gray-500 text-sm mb-4">Update abstracts and keywords, then re-run search.</p>
                    
                    <div className="space-y-5 overflow-y-auto flex-1 pr-1" style={{ minHeight: '200px' }}>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">Abstracts</label>
                                <button onClick={handleAddAbstract} className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">+ Add abstract</button>
                            </div>
                            <div className="space-y-3">
                                {abstracts.map((abs, i) => (
                                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                                            <span className="text-xs text-gray-600">Abstract #{i + 1}</span>
                                            {abstracts.length > 1 && (
                                                <button onClick={() => handleRemoveAbstract(i)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
                                            )}
                                        </div>
                                        <textarea
                                            rows="5"
                                            className="w-full p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-none resize-y"
                                            placeholder="Paste or type your abstract..."
                                            value={abs}
                                            onChange={(e) => handleAbstractChange(i, e.target.value)}
                                        ></textarea>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Keywords</label>
                            <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg">
                                {keywords.map((kw, i) => <KeywordChip key={`${kw}-${i}`} keyword={kw} onRemove={() => removeKeyword(kw)} />)}
                                <input
                                    type="text"
                                    placeholder="Type and press Enter"
                                    className="flex-1 min-w-[180px] outline-none py-1"
                                    value={keywordInput}
                                    onChange={e => setKeywordInput(e.target.value)}
                                    onKeyDown={handleKeywordKeyDown}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-1 block">Year filter</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="min"
                                    className="px-3 py-2 border rounded-md w-28"
                                    value={yearMin}
                                    onChange={e => setYearMin(e.target.value)}
                                />
                                <span className="text-gray-500">—</span>
                                <input
                                    type="number"
                                    placeholder="max"
                                    className="px-3 py-2 border rounded-md w-28"
                                    value={yearMax}
                                    onChange={e => setYearMax(e.target.value)}
                                />
                                <button type="button" className="link-sm ml-2" onClick={() => { setYearMin(''); setYearMax(''); setYearError(''); setIsYearValid(true); }}>
                                    Clear
                                </button>
                                <div style={{ fontSize: 12, color: '#6b7280' }} className="ml-3">Leave empty to disable</div>
                            </div>
                            {yearError && (
                                <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>{yearError}</div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                                                <button onClick={handleApply} disabled={!isYearValid} className={`flex-1 px-4 py-3 rounded-lg font-medium ${isYearValid ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                                                    Apply & Search
                                                </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditQueryModal;
