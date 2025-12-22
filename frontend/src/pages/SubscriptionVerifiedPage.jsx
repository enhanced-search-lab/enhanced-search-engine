// src/pages/SubscriptionVerifiedPage.jsx
import React, { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function SubscriptionVerifiedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const status = params.get("status");
  const subId = params.get("sub_id");

  const isSuccess = status === "success";
  const isError = status === "error";

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const handleBackToSearch = useCallback(async () => {
    // sub_id yoksa, normal boş search sayfasına git
    if (!subId) {
      navigate("/search");
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      // 1) Subscription detaylarını çek
      const res = await fetch(`${API_BASE}/api/subscriptions/${subId}/`);
      if (!res.ok) {
        throw new Error(`Failed to load subscription (status ${res.status})`);
      }
      const data = await res.json();

      const abstracts = data.abstracts || [];
      const keywords = data.keywords || [];

      // 2) URL query paramlarını hazırla
      const sp = new URLSearchParams();
      abstracts.forEach((a) => sp.append("abstract", a));
      if (keywords.length) {
        sp.set("keywords", keywords.join(","));
      }
      sp.set("page", "1");

      // 3) Search sayfasına URL ile git
      navigate(`/search?${sp.toString()}`);
    } catch (err) {
      console.error(err);
      setLoadError(err.message || "Failed to open search with this subscription.");
    } finally {
      setLoading(false);
    }
  }, [navigate, subId]);

  return (
    <div className="flex justify-center px-4">
      <div className="w-full max-w-xl py-16">
        <div className="rounded-3xl border border-slate-200 bg-white/80 px-8 py-10 text-center shadow-lg shadow-slate-200/60 backdrop-blur-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-2xl text-white">
            {isSuccess ? "✓" : isError ? "!" : "i"}
          </div>

          {isSuccess && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Subscription verified
              </h1>
              <p className="text-slate-600">
                You’ll start receiving email updates for this search.
              </p>
            </>
          )}

          {isError && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Verification link is not valid
              </h1>
              <p className="text-slate-600">
                The link may be expired or already used. Please try subscribing
                again from the search page.
              </p>
            </>
          )}

          {!isSuccess && !isError && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Subscription status
              </h1>
              <p className="text-slate-600">
                We could not determine the status of your subscription. Please
                try again from the search page.
              </p>
            </>
          )}

          {loadError && (
            <p className="mt-4 text-sm text-red-500">{loadError}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleBackToSearch}
              disabled={loading}
              className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? "Opening search..." : "Back to search"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Go to homepage
            </button>
          </div>


          {isSuccess && (
            <p className="mt-4 text-xs text-slate-400">
              If you didn’t request this subscription, no action is required.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
