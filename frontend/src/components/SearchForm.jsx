import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, createSearchParams } from 'react-router-dom';

const KeywordChip = ({ keyword, onRemove }) => (
    <span className="inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 px-4 rounded-full text-sm font-medium animate-pulse">
        {keyword}
        <button onClick={() => onRemove(keyword)} className="ml-2 text-white opacity-70 hover:opacity-100">
            &times;
        </button>
    </span>
);

const SearchForm = () => {
    const [abstracts, setAbstracts] = useState(['']);
    const [keywords, setKeywords] = useState([]);
    const [keywordInput, setKeywordInput] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state) {
            const { abstracts: prevAbstracts, keywords: prevKeywords } = location.state;
            if (prevAbstracts && prevAbstracts.length > 0) setAbstracts(prevAbstracts);
            if (prevKeywords) setKeywords(prevKeywords);
        }
    }, [location.state]);

    const handleAddAbstract = () => setAbstracts([...abstracts, '']);
    const handleAbstractChange = (index, value) => {
        const newAbstracts = [...abstracts];
        newAbstracts[index] = value;
        setAbstracts(newAbstracts);
    };
    const handleRemoveAbstract = (index) => setAbstracts(abstracts.filter((_, i) => i !== index));
    const handleKeywordInputChange = (e) => setKeywordInput(e.target.value);

    const handleKeywordKeyDown = (e) => {
        if (e.key === 'Enter' && keywordInput.trim()) {
            e.preventDefault();
            if (!keywords.includes(keywordInput.trim())) {
                setKeywords([...keywords, keywordInput.trim()]);
            }
            setKeywordInput('');
        }
    };

    const removeKeyword = (keywordToRemove) => setKeywords(keywords.filter(keyword => keyword !== keywordToRemove));
    const handleExampleClick = (example) => {
        if (!keywords.includes(example)) setKeywords([...keywords, example]);
    };

    const handleSearch = () => {
        const nonEmptyAbstracts = abstracts.map(a => a.trim()).filter(a => a);
        if (nonEmptyAbstracts.length === 0 && keywords.length === 0) {
            alert('Please enter at least one abstract or keyword to search.');
            return;
        }
        
        navigate('/search', {
            state: {
                abstracts: nonEmptyAbstracts,
                keywords: keywords,
                // optionally keep year_min/year_max here later
            }
        });
    };

    return (
        <section className="gradient-bg network-dots pt-24 pb-16 min-h-full">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight drop-shadow-lg">
                    Discover the Most Relevant<br />
                    <span className="bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">Research Articles</span> Instantly
                </h2>
                <p className="text-xl text-black/80 mb-12 max-w-2xl mx-auto drop-shadow-md">
                    Paste an abstract or enter keywords to explore top matches from millions of academic papers
                </p>
                
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="glass-effect rounded-3xl p-8 shadow-2xl border border-white/20">
                        
                        <div>
                            <h4 className="text-xl font-semibold text-gray-800 mb-4 text-left">Keywords</h4>
                            <div className="min-h-[80px] w-full p-3 bg-white rounded-xl border-4 border-purple-300 focus-within:border-purple-500 flex flex-wrap gap-2 items-start">
                                {keywords.map(kw => <KeywordChip key={kw} keyword={kw} onRemove={removeKeyword} />)}
                                <input 
                                    type="text"
                                    value={keywordInput}
                                    onChange={handleKeywordInputChange}
                                    onKeyDown={handleKeywordKeyDown}
                                    placeholder="Type keywords and press Enter..."
                                    className="flex-grow bg-transparent outline-none p-2 text-gray-800 placeholder-gray-500 min-w-[200px]"
                                />
                            </div>
                        </div>

                        <div className="mt-8">
                            <h4 className="text-xl font-semibold text-gray-800 mb-4 text-left">Abstracts</h4>
                            <div className="space-y-4">
                                {abstracts.map((abstract, index) => (
                                    <div key={index} className="relative">
                                        <textarea 
                                            placeholder="Paste your research abstract here..."
                                            value={abstract}
                                            onChange={(e) => handleAbstractChange(index, e.target.value)}
                                            className="w-full px-6 py-4 text-lg border-4 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none resize-none h-40 transition-all duration-300 bg-white text-gray-800 placeholder-gray-500 shadow-lg focus:shadow-xl"
                                        ></textarea>
                                        {abstracts.length > 1 && (
                                            <button onClick={() => handleRemoveAbstract(index)} className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-all flex items-center justify-center">
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="text-right mt-3">
                                <button onClick={handleAddAbstract} className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-all text-sm">
                                    + Add another abstract
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <button onClick={handleSearch} className="search-button px-12 py-4 text-white font-semibold rounded-xl text-xl">
                                🔎 Search Research Papers
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                        <span className="text-sm text-black/70 mr-2 font-medium self-center">Try examples:</span>
                        {['AI in Healthcare', 'Climate Policy', 'Urban Governance'].map(ex => (
                            <button key={ex} onClick={() => handleExampleClick(ex)} className="chip px-4 py-2 bg-white/90 text-gray-700 rounded-full text-sm font-medium cursor-pointer border border-white/30 shadow-lg">
                                {ex}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SearchForm;
