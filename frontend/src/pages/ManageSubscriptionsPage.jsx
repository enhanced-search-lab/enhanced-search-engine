// Manage subscriptions page
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

  import {
    getSubscriptionsByToken,
    unsubscribeSubscription,
    toggleSubscriptionActive,
    getGoodMatches,
    deleteGoodMatch,
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

    // Good matches (items the user marked from emails)
    const [goodMatches, setGoodMatches] = useState([]);
    const [gmLoading, setGmLoading] = useState(false);
    const [gmError, setGmError] = useState("");
    const [gmBusyId, setGmBusyId] = useState(null);

    // Per-subscription expanded state for abstracts (array of indexes)
    const [expandedAbstracts, setExpandedAbstracts] = useState({});

    // For modal dialog
    const [confirmingSub, setConfirmingSub] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [confirmMode, setConfirmMode] = useState("toggle"); // 'toggle' or 'delete'

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

      // also load good matches
      (async () => {
        try {
          setGmLoading(true);
          setGmError("");
          const data = await getGoodMatches(token);
          setGoodMatches(data.good_matches || []);
        } catch (err) {
          setGmError(err.message || "Failed to load good matches.");
        } finally {
          setGmLoading(false);
        }
      })();
    }, [token, loadSubscriptions]);

    // token yoksa erken return
    if (!token) {
      return (
        <div className="flex justify-center px-4">
          <div className="w-full max-w-xl py-16 text-center">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Manage subscriptions</h1>
            <p className="text-slate-600">No token provided. Please open this page via the link in your email.</p>
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
      <div className="font-sans antialiased text-slate-900">
        <div className="flex justify-center px-4">
          <div className="w-full max-w-3xl py-12">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">Manage your subscriptions</h1>
              {email && (
                <p className="mt-1 text-sm text-slate-600">Email: <span className="font-medium">{email}</span></p>
              )}
            </div>

            {loading && <p className="text-slate-600">Loading your subscriptions…</p>}



            {error && !loading && <p className="text-red-500 text-sm mb-4">{error}</p>}

            {!loading && !error && subs.length === 0 && (
              <p className="text-slate-600">You don't have any subscriptions.</p>
            )}

            {!loading && !error && subs.length > 0 && (
              <ul className="space-y-4">
                {subs.map((sub) => (
                  <li key={sub.id} className={`relative rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm ${!sub.is_active ? "opacity-60" : ""}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <h2 className="text-sm font-semibold text-slate-900">{sub.query_name}</h2>
                        <p className="mt-1 text-xs text-slate-500">Created: {new Date(sub.created_at).toLocaleString()}</p>

                            {sub.abstracts && sub.abstracts.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1" title="Saved abstracts for this subscription">Abstracts</div>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                              {sub.abstracts.map((a, i) => {
                                const isExpanded = (expandedAbstracts[sub.id] || []).includes(i);
                                const needsToggle = (a || "").length > 220;
                                return (
                                  <li key={i} className="mb-1">
                                    <div className={isExpanded ? "rc-abs whitespace-normal break-words text-sm text-slate-700 text-justify" : "rc-abs line-clamp-3 text-sm text-slate-700 text-justify"}>{a}</div>
                                    {needsToggle && (
                                      <div className="text-xs text-slate-500 mt-1">
                                        <button type="button" onClick={() => {
                                          setExpandedAbstracts((prev) => {
                                            const arr = (prev[sub.id] || []).slice();
                                            const idx = arr.indexOf(i);
                                            if (idx >= 0) arr.splice(idx, 1);
                                            else arr.push(i);
                                            return { ...prev, [sub.id]: arr };
                                          });
                                        }} className="underline text-indigo-600 hover:text-indigo-800">{isExpanded ? "Show less" : "Show more"}</button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {sub.keywords && sub.keywords.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1" title="Keywords for this subscription">Keywords</div>
                            <div className="flex flex-wrap gap-1">{sub.keywords.map((k, i) => <span key={i} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{k}</span>)}</div>
                          </div>
                        )}

                        {/* Good matches will be rendered in a separate full-width table below */}
                      </div>

                      <div className="flex flex-row sm:flex-col gap-2 sm:items-end">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.is_verified ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                          {sub.is_verified ? "Verified" : "Pending"}
                        </span>

                        <button type="button" title={sub.is_active ? "Unsubscribe from weekly emails" : "Reactivate subscription"} onClick={() => { setConfirmMode("toggle"); setConfirmingSub(sub); }} disabled={busyId === sub.id} className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                          {busyId === sub.id ? sub.is_active ? "Removing…" : "Activating…" : sub.is_active ? "Unsubscribe" : "Reactivate"}
                        </button>
                      </div>
                    </div>

                    {/* Good matches shown as stacked cards (not a table). They fill the card area above the delete row. */}
                    {(() => {
                      const subMatches = (goodMatches || []).filter((g) => g.subscription_id === sub.id).slice().sort((a, b) => (b.score || 0) - (a.score || 0));
                      if (!subMatches || subMatches.length === 0) return null;
                      return (
                        <div className="mt-4">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Good matches</div>
                          <div className="space-y-3">
                            {subMatches.map((gm) => (
                              <div key={gm.id} className="relative bg-slate-50 rounded-md p-4">
                                {gm.score !== undefined && gm.score !== null && (
                                  <div className="absolute right-3 top-3 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">{`Similarity: ${Math.round(gm.score)}%`}</div>
                                )}

                                <div className="block pr-28">
                                  <a href={gm.openalex_url || '#'} target="_blank" rel="noreferrer" className="text-sm text-slate-900 leading-snug hover:underline">{gm.title}</a>
                                  {/* larger spacer line under the title */}
                                  <div className="h-4" aria-hidden="true" />
                                  <div className="text-xs text-slate-500 mt-2">{gm.last_clicked_at ? new Date(gm.last_clicked_at).toLocaleString() : 'Saved'}</div>
                                </div>

                                <div className="absolute right-4 bottom-4">
                                  <button title="Remove this saved match" onClick={async () => {
                                    if (!token) return;
                                    try {
                                      setGmBusyId(gm.id);
                                      await deleteGoodMatch(gm.id, token);
                                      setGoodMatches((prev) => prev.filter((x) => x.id !== gm.id));
                                    } catch (err) {
                                      alert(err.message || 'Failed to remove match.');
                                    } finally { setGmBusyId(null); }
                                  }} disabled={gmBusyId === gm.id} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60">{gmBusyId === gm.id ? '…' : 'Remove'}</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Place Delete on its own row so it's visually separate */}
                    <div className="mt-4 border-t pt-3 flex justify-end">
                      <button type="button" onClick={() => { setConfirmMode("delete"); setConfirmingSub(sub); }} disabled={busyId === sub.id} className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex justify-center">
              <button onClick={() => navigate("/")} className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700">Go to homepage</button>
            </div>
          </div>
        </div>

        {/* Unsubscribe confirmation modal */}
        {confirmingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-black/40" onClick={() => !confirmLoading && setConfirmingSub(null)} />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{confirmMode === "delete" ? "Delete subscription permanently?" : "Unsubscribe from this search?"}</h2>
              <p className="text-sm text-slate-600 mb-3">{confirmMode === "delete" ? "This will permanently remove the subscription and cannot be undone." : "You will stop receiving weekly suggestions for:"}</p>
              <p className="text-sm font-medium text-slate-900 bg-slate-50 rounded-xl px-3 py-2 mb-4">{confirmingSub.query_name}</p>

              {confirmingSub.keywords && confirmingSub.keywords.length > 0 && (
                <p className="text-xs text-slate-500 mb-4">Keywords:&nbsp;<span className="font-medium">{confirmingSub.keywords.join(", ")}</span></p>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setConfirmingSub(null)} disabled={confirmLoading} className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
                {confirmMode === "delete" ? (
                  <button type="button" onClick={async () => {
                    try {
                      setConfirmLoading(true);
                      setBusyId(confirmingSub.id);
                      const { deleteSubscription } = await import("../services/api");
                      await deleteSubscription(confirmingSub.id, token);
                      setSubs((prev) => prev.filter((s) => s.id !== confirmingSub.id));
                      setConfirmingSub(null);
                    } catch (err) {
                      alert(err.message || "Failed to delete subscription.");
                    } finally { setConfirmLoading(false); setBusyId(null); }
                  }} disabled={confirmLoading} className="px-4 py-2 rounded-full text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">{confirmLoading ? "Deleting…" : "Delete permanently"}</button>
                ) : (
                  <button type="button" onClick={async () => {
                    try {
                      setConfirmLoading(true);
                      setBusyId(confirmingSub.id);
                      const updated = await toggleSubscriptionActive(confirmingSub.id, token);
                      setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                      setConfirmingSub(null);
                    } catch (err) {
                      alert(err.message || "Failed to update subscription state.");
                    } finally { setConfirmLoading(false); setBusyId(null); }
                  }} disabled={confirmLoading} className={`px-4 py-2 rounded-full text-sm font-medium text-white ${confirmingSub && confirmingSub.is_active ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"} disabled:opacity-60`}>{confirmLoading ? (confirmingSub && confirmingSub.is_active ? "Removing…" : "Activating…") : (confirmingSub && confirmingSub.is_active ? "Yes, unsubscribe" : "Yes, reactivate")}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
       
