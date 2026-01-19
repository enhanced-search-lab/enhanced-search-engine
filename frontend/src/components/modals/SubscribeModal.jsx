import React, { useState } from "react";
import { subscribeToSearch } from "../../services/api"; // update path if needed

const SubscribeModal = ({ isOpen, onClose, queryParams, initialQueryName = "" }) => {
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    const queryName = e.target.elements.queryName.value.trim();
    const email = e.target.elements.queryEmail.value.trim();
    const confirmed = e.target.elements.queryConfirm.checked;

    if (!queryName || !email || !confirmed) {
      setStatusMessage("Please fill in all fields and confirm.");
      return;
    }

    try {
      setLoading(true);

      const res = await subscribeToSearch({
        email,
        query_name: queryName,
        agree_to_emails: confirmed,
        abstracts: queryParams?.abstracts || [],
        keywords: queryParams?.keywords || []
        
      });

      if (res.status === "already_verified") {
        setStatusMessage("You are already subscribed to this search.");
      } else if (res.status === "pending_verification") {
        setStatusMessage(
          "Subscription created. Check your inbox for a verification link."
        );
      } else {
        setStatusMessage(
          "Subscription created. You will receive weekly suggestions."
        );
      }


      // close after a short delay
      setTimeout(() => {
        onClose();
        setStatusMessage("");
      }, 1500);
    } catch (err) {
      setStatusMessage(err.message || "Subscription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="modal-backdrop fixed inset-0 bg-black/30"></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="modal-in bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          onClick={stopPropagation}
        >
            <div className="text-center mb-4">
            <div className="text-4xl mb-2">📬</div>
            <h3 className="text-lg font-semibold text-gray-900">
              Subscribe to this query
            </h3>
            <p className="text-gray-600 text-sm">
              Get weekly updates for results matching your abstracts & keywords.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" title="Name shown in emails and in your subscriptions list">
                Query name
              </label>
              <input
                type="text"
                id="queryName"
                name="queryName"
                required
                defaultValue={initialQueryName}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Transformers in NLP"
                title="Name shown in emails and in your subscriptions list"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" title="We'll send a verification link and weekly updates to this address">
                Email address
              </label>
              <input
                type="email"
                id="queryEmail"
                name="queryEmail"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="your.email@example.com"
                title="We'll send a verification link and weekly updates to this address"
              />
            </div>
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="queryConfirm"
                name="queryConfirm"
                required
                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label
                htmlFor="queryConfirm"
                className="text-sm text-gray-600 cursor-pointer"
                title="Required to receive email updates"
              >
                I agree to receive email notifications for this query.
              </label>
            </div>

            {statusMessage && (
              <p className={`text-xs bg-gray-50 rounded-md p-2 ${statusMessage.includes('The fields email, query_name must make a unique set.') ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                {statusMessage}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                title="Cancel subscription creation"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                title="Create subscription (you'll verify via email)"
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                disabled={loading}
              >
                {loading ? "Subscribing…" : "Subscribe"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubscribeModal;
