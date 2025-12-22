import React from 'react';

const Footer = () => {
    return (
        <footer id="contact" className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <div className="mb-8">
                        <h4 className="text-2xl font-bold text-blue-400 mb-4">Proxima</h4>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Empowering researchers with intelligent paper discovery and personalized recommendations
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-6 mb-8">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
                        <a href="mailto:appproximaa@gmail.com" className="text-gray-400 hover:text-white transition-colors">Contact</a>
                    </div>
                    
                    <div className="border-t border-gray-800 pt-8">
                        <p className="text-gray-400 text-sm">
                            © 2025 Proxima | Powered by OpenAlex 
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            <a href="mailto:appproximaa@gmail.com" className="hover:text-gray-300 transition-colors">appproximaa@gmail.com</a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
