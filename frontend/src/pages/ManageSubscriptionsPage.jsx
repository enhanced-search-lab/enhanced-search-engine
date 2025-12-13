// src/pages/ManageSubscriptionsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getSubscriptionsByToken,
  unsubscribeSubscription,
} from "../services/api";

export default function ManageSubscriptionsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // modal için
  const [confirmingSub, setConfirmingSub] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await getSubscriptionsByToken(token);
      setEmail(data.email || "");
      setSubs(data.subscriptions || []);
    } catch (err) {
      setError(err.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Missing token. Please use the link in your email.");
      return;
    }
    loadSubscriptions();
  }, [token, loadSubscriptions]);

  // token yoksa erken return
  if (!token) {
    return (
      <div className="flex justify-center px-4">
        <div className="w-full max-w-xl py-16 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Manage subscriptions
          </h1>
          <p className="text-slate-600">
            No token provided. Please open this page via the link in your email.
          </p>
          <button
            className="mt-6 inline-flex items-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => navigate("/")}
          >
            Go to homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center px-4">
        <div className="w-full max-w-3xl py-12">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Manage your subscriptions
            </h1>
            {email && (
              <p className="mt-1 text-sm text-slate-600">
                Email: <span className="font-medium">{email}</span>
              </p>
            )}
          </div>

          {loading && (
            <p className="text-slate-600">Loading your subscriptions…</p>
          )}

          {error && !loading && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          {!loading && !error && subs.length === 0 && (
            <p className="text-slate-600">
              You don&apos;t have any active subscriptions.
            </p>
          )}

          {!loading && !error && subs.length > 0 && (
            <ul className="space-y-4">
              {subs.map((sub) => (
                <li
                  key={sub.id}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold text-slate-900">
                        {sub.query_name}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Created: {new Date(sub.created_at).toLocaleString()}
                      </p>

                      {sub.abstracts && sub.abstracts.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                            Abstracts
                          </div>
                          <ul className="space-y-1 text-sm text-slate-700">
                            {sub.abstracts.slice(0, 2).map((a, i) => (
                              <li key={i} className="line-clamp-2">
                                • {a}
                              </li>
                            ))}
                            {sub.abstracts.length > 2 && (
                              <li className="text-xs text-slate-500">
                                (+{sub.abstracts.length - 2} more)
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {sub.keywords && sub.keywords.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                            Keywords
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sub.keywords.map((k, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 sm:items-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sub.is_verified
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {sub.is_verified ? "Verified" : "Pending"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setConfirmingSub(sub)} // 👈 modal aç
                        disabled={busyId === sub.id}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {busyId === sub.id ? "Removing…" : "Unsubscribe"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Go to homepage
            </button>
            <button
              onClick={() => navigate("/search")}
              className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Go to search
            </button>
          </div>
        </div>
      </div>

      {/* Unsubscribe confirmation modal */}
      {confirmingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !confirmLoading && setConfirmingSub(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Unsubscribe from this search?
            </h2>
            <p className="text-sm text-slate-600 mb-3">
              You will stop receiving weekly suggestions for:
            </p>
            <p className="text-sm font-medium text-slate-900 bg-slate-50 rounded-xl px-3 py-2 mb-4">
              {confirmingSub.query_name}
            </p>

            {confirmingSub.keywords &&
              confirmingSub.keywords.length > 0 && (
                <p className="text-xs text-slate-500 mb-4">
                  Keywords:&nbsp;
                  <span className="font-medium">
                    {confirmingSub.keywords.join(", ")}
                  </span>
                </p>
              )}

            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setConfirmingSub(null)}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setConfirmLoading(true);
                    setBusyId(confirmingSub.id);
                    await unsubscribeSubscription(confirmingSub.id, token);
                    setSubs((prev) =>
                      prev.filter((s) => s.id !== confirmingSub.id)
                    );
                    setConfirmingSub(null);
                  } catch (err) {
                    alert(err.message || "Failed to unsubscribe.");
                  } finally {
                    setConfirmLoading(false);
                    setBusyId(null);
                  }
                }}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-full bg-rose-600 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {confirmLoading ? "Removing…" : "Yes, unsubscribe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
