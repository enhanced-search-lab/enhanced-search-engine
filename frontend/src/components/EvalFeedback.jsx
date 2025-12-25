import React, { useState } from "react";

// Polished evaluation widget: nicer layout, accessible choice buttons and a
// visually pleasing recorded-feedback card. Keeps the same simple API: the
// parent `onSubmit` may return a persisted-like object (preferred) or nothing.
export default function EvalFeedback({ onSubmit }) {
  const [choice, setChoice] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedResult, setSavedResult] = useState(null);

  const handleSubmit = async () => {
    if (!choice || submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmit?.({ choice, comment: comment.trim() || null });
      if (res) setSavedResult(res);
      else setSavedResult({ choice, comment: comment.trim() || null, ts: new Date().toISOString() });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const mapChoice = (c) => {
    if (c === "left") return "Left column";
    if (c === "middle") return "Middle column";
    if (c === "right") return "Right column";
    return c || "-";
  };

  const mapSetup = (s) => {
    if (!s) return "-";
    if (s === "embedding") return "Embedding (semantic similarity)";
    if (s === "raw_openalex") return "Keyword search (OpenAlex)";
    if (s === "gemini_openalex") return "LLM-assisted keyword search (OpenAlex)";
    return s;
  };

  return (
    <div className="mt-4 p-4 rounded-lg bg-white shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Which results felt more relevant to you?</h3>

      <div className="mt-3 flex gap-2">
        {[
          { key: "left", label: "Left" },
          { key: "middle", label: "Middle" },
          { key: "right", label: "Right" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setChoice(opt.key)}
            className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors focus:outline-none ${
              choice === opt.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
            aria-pressed={choice === opt.key}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment (what you liked or missed)"
        rows={3}
        className="mt-3 w-full rounded-md border border-slate-200 p-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-200"
      />

      <div className="mt-3 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!choice || submitting}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            !choice || submitting
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {submitting ? "Sending..." : "Send feedback"}
        </button>
      </div>

      {submitted && savedResult && (
        <div className="mt-4 border-l-4 border-green-500 bg-green-50 p-4 rounded-md shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Feedback saved</div>
              <div className="mt-1 text-sm text-slate-700">Thanks — your preference was recorded.</div>
            </div>
            <div className="text-xs text-slate-500">
              {savedResult.ts && new Date(savedResult.ts).toLocaleString()}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white border text-xs text-slate-700">
              <strong className="font-medium">Choice:</strong>
              <span className="ml-1">{mapChoice(savedResult.choice)}</span>
            </span>

            <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white border text-xs text-slate-700">
              <strong className="font-medium">Chosen method:</strong>
              <span className="ml-1">{mapSetup(savedResult.chosen_setup)}</span>
            </span>

            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white border text-xs text-slate-700">
              <strong className="font-medium">Layout:</strong>
              <span className="ml-1">L: {mapSetup(savedResult.layout?.left)}</span>
              <span className="mx-1">·</span>
              <span>M: {mapSetup(savedResult.layout?.middle)}</span>
              <span className="mx-1">·</span>
              <span>R: {mapSetup(savedResult.layout?.right)}</span>
            </div>
          </div>

          {savedResult.comment && (
            <div className="mt-3 text-sm text-slate-800">
              <strong>Comment:</strong>
              <div className="mt-1 text-sm text-slate-700">{savedResult.comment}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
