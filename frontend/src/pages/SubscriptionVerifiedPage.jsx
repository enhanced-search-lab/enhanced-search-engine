import React from "react";
import { useLocation, Link } from "react-router-dom";

const SubscriptionVerifiedPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const status = params.get("status"); // "success" | "error" | null

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">
          {isSuccess ? "✅" : "⚠️"}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {isSuccess ? "Subscription confirmed" : "Verification link invalid"}
        </h1>

        <p className="text-gray-600 text-sm mb-6">
          {isSuccess
            ? "Your email has been verified. You’ll now receive weekly updates for your saved query."
            : "The verification link is invalid or has already been used. Try subscribing again from the search page."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/search"
            className="inline-flex justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Back to search
          </Link>
          <Link
            to="/"
            className="inline-flex justify-center px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionVerifiedPage;
