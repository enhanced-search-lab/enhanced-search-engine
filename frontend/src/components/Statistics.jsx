import React from 'react';

const StatCard = ({ value, label, gradient }) => (
    <div className="text-center">
        <div className={`${gradient} rounded-3xl p-8 mb-4 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
            <div className="text-5xl font-bold mb-3">{value}</div>
            <div className="font-semibold opacity-90">{label}</div>
        </div>
    </div>
);

const Statistics = () => {
    const stats = [
        { value: '249M+', label: 'Research Papers', gradient: 'bg-gradient-to-br from-blue-400 to-blue-600' },
        { value: '91M+', label: 'Authors', gradient: 'bg-gradient-to-br from-emerald-400 to-emerald-600' },
        { value: '109K+', label: 'Institutions', gradient: 'bg-gradient-to-br from-purple-400 to-purple-600' },
        { value: '65K+', label: 'Research Topics', gradient: 'bg-gradient-to-br from-orange-400 to-orange-600' },
    ];

    return (
        <section id="statistics" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">Powered by OpenAlex</h3>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Access the world's largest open catalog of scholarly papers, authors, institutions, and research topics
                    </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
                </div>
            </div>
        </section>
    );
};

export default Statistics;
