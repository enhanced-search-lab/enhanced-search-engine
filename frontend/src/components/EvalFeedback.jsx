import React, { useState } from "react";

// Polished evaluation widget: nicer layout, accessible choice buttons and a
// visually pleasing recorded-feedback card. Keeps the same simple API: the
// parent `onSubmit` may return a persisted-like object (preferred) or nothing.
export default function EvalFeedback({ onSubmit }) {
  // Sıralama: ['left', 'middle', 'right'] gibi
  const [ranking, setRanking] = useState([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedResult, setSavedResult] = useState(null);

  const handleSelect = (col) => {
    // Toggle or move column in ranking
    setRanking((prev) => {
      const idx = prev.indexOf(col);
      if (idx === -1) return [...prev, col];
      // Remove if already selected
      return prev.filter((c) => c !== col);
    });
  };

  const handleSubmit = async () => {
    if (ranking.length !== 3 || submitting || submitted) return;
    setSubmitting(true);
    try {
      const res = await onSubmit?.({ ranking, comment: comment.trim() || null });
      if (res) {
        // Fallback: choice ve chosen_setup alanları yoksa, ranking ve embedding ile doldur
        setSavedResult({
          ...res,
          choice: res.choice ?? (ranking && ranking[0]) ?? "-",
          chosen_setup: res.chosen_setup ?? "embedding"
        });
      } else {
        setSavedResult({
          ranking,
          comment: comment.trim() || null,
          ts: new Date().toISOString(),
          choice: ranking && ranking[0] ? ranking[0] : "-",
          chosen_setup: "embedding"
        });
      }
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
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Please rank the columns below from most to least relevant <span className="text-slate-500">(1: most relevant)</span>
      </h3>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts: What did you like or miss? (Optional)"
        rows={3}
        className="mb-6 w-full rounded-md border border-slate-200 p-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-200"
      />

      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={ranking.length !== 3 || submitting || submitted}
          className={`px-6 py-3 rounded-md text-base font-semibold transition ${
            ranking.length !== 3 || submitting || submitted
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {submitting ? "Submitting..." : submitted ? "Feedback sent" : "Save feedback"}
        </button>
      </div>

      <div className="flex w-full justify-between mt-8">
        <div className="flex-1 flex justify-center">
          <div>
            {(() => {
              const col = "left";
              const rank = ranking.indexOf(col);
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleSelect(col)}
                  className={`rounded-full px-8 py-4 font-semibold text-white text-lg transition focus:outline-none ${
                    rank !== -1
                      ? "bg-indigo-600"
                      : "bg-indigo-400 hover:bg-indigo-500"
                  }`}
                  aria-pressed={rank !== -1}
                >
                  {rank !== -1 ? `${rank + 1}. Selected` : `Select`}
                </button>
              );
            })()}
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <div>
            {(() => {
              const col = "middle";
              const rank = ranking.indexOf(col);
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleSelect(col)}
                  className={`rounded-full px-8 py-4 font-semibold text-white text-lg transition focus:outline-none ${
                    rank !== -1
                      ? "bg-indigo-600"
                      : "bg-indigo-400 hover:bg-indigo-500"
                  }`}
                  aria-pressed={rank !== -1}
                >
                  {rank !== -1 ? `${rank + 1}. Selected` : `Select`}
                </button>
              );
            })()}
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <div>
            {(() => {
              const col = "right";
              const rank = ranking.indexOf(col);
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleSelect(col)}
                  className={`rounded-full px-8 py-4 font-semibold text-white text-lg transition focus:outline-none ${
                    rank !== -1
                      ? "bg-indigo-600"
                      : "bg-indigo-400 hover:bg-indigo-500"
                  }`}
                  aria-pressed={rank !== -1}
                >
                  {rank !== -1 ? `${rank + 1}. Selected` : `Select`}
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {submitted && savedResult && (
        <div className="mt-4 border-l-4 border-green-500 bg-green-50 p-4 rounded-md shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-green-700">Your feedback has been saved!</div>
              <div className="mt-1 text-sm text-slate-700">Thank you, your input is truly valuable to us. Your ranking was received successfully. 🎉</div>
            </div>
            <div className="text-xs text-slate-500">
              {savedResult.ts && new Date(savedResult.ts).toLocaleString()}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
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
