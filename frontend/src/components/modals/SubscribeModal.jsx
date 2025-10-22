import React from 'react';

const SubscribeModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const email = e.target.elements.queryEmail.value;
        alert(`Subscription request sent!\n\nA confirmation email has been sent to ${email}. Please click the link to confirm your subscription.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50" onClick={onClose}>
            <div className="modal-backdrop fixed inset-0"></div>
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <div className="modal-in bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                    <div className="text-center mb-4">
                        <div className="text-4xl mb-2">📬</div>
                        <h3 className="text-lg font-semibold text-gray-900">Subscribe to this query</h3>
                        <p className="text-gray-600 text-sm">Get weekly updates for results matching your abstracts & keywords.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Query name</label>
                            <input type="text" id="queryName" required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g., Transformers in NLP" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                            <input type="email" id="queryEmail" required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="your.email@example.com" />
                        </div>
                        <div className="flex items-start space-x-3">
                            <input type="checkbox" id="queryConfirm" required
                                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            <label htmlFor="queryConfirm" className="text-sm text-gray-600">
                                I agree to receive email notifications for this query.
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
                            <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Subscribe</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubscribeModal;
