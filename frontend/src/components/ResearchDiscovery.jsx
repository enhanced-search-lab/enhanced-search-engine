import React from 'react';

const ResearchDiscovery = () => {
  return (
    <section
      id="research-discovery"
      className="py-20 mb-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl mx-4 md:mx-12 text-white shadow-2xl"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center px-6 md:px-12">
        
        {/* Left Section: Text */}
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Real-time Research Discovery</h2>
          <p className="text-lg opacity-90 leading-relaxed mb-8">
            Our AI-powered semantic search analyzes millions of academic papers to find the most relevant research for your queries.
            Get instant access to papers, citations, author networks, and trending research topics.
          </p>

          <div className="flex flex-wrap gap-4">
            <span className="flex items-center bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Updated Daily
            </span>
            <span className="flex items-center bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Open Access
            </span>
            <span className="flex items-center bg-white/20 px-4 py-2 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
              </svg>
              Global Coverage
            </span>
          </div>
        </div>

        {/* Right Section: Illustration */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Main Circle */}
            <div className="w-64 h-64 bg-gradient-to-br from-white to-gray-50 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-white/40">
              <div className="text-5xl mb-2">🧠</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI-Powered
              </div>
              <p className="text-gray-600 font-medium">Semantic Search</p>
            </div>

            {/* Floating icons */}
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl">
              <span className="text-3xl">💡</span>
            </div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResearchDiscovery;
