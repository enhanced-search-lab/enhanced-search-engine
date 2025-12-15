import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    // Refactored effect to handle body scroll lock
    useEffect(() => {
        if (isMenuOpen) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }
        // Cleanup function to ensure the class is removed when the component unmounts
        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    }, [isMenuOpen]);


    useEffect(() => {
        // Close mobile menu on navigation
        setIsMenuOpen(false);
    }, [location.pathname]);


    const toggleMenu = () => {
        setIsMenuOpen(prev => !prev);
    };

    return (
        <>
            <header id="header" className="bg-white shadow-md py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Proxima</Link>
                        </div>
                        <nav className="hidden md:flex space-x-8 items-center">
                            <a href="/#statistics" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">Database</a>
                            <a href="/#contact" className="text-gray-700 hover:text-purple-600 font-medium transition-colors">Contact</a>
                            {/* language selector removed (no translations available) */}
                        </nav>
                        <button id="mobileMenuBtn" className="md:hidden text-gray-700 relative z-50" onClick={toggleMenu}>
                            <svg id="hamburgerIcon" className={`w-6 h-6 transition-transform duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                            </svg>
                            <svg id="closeIcon" className={`w-6 h-6 transition-transform duration-300 absolute top-0 left-0 ${!isMenuOpen ? 'opacity-0' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div id="mobileMenu" className={`fixed inset-0 bg-white z-40 transform transition-transform duration-300 md:hidden ${isMenuOpen ? '' : 'translate-x-full'}`}>
                <div className="pt-24 px-6">
                    <nav className="space-y-6">
                        <a href="/#statistics" onClick={toggleMenu} className="block text-2xl font-medium text-gray-700 hover:text-purple-600 transition-colors">Database</a>
                        <a href="/#contact" onClick={toggleMenu} className="block text-2xl font-medium text-gray-700 hover:text-purple-600 transition-colors">Contact</a>
                        {/* language selector removed from mobile menu */}
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Header;
