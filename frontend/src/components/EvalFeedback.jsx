import React, { useState } from "react";

// Simple evaluation widget shown only in evaluation mode so users can indicate which list felt better.
export default function EvalFeedback({ onSubmit }) {
  const [choice, setChoice] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!choice || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.({ choice, comment: comment.trim() || null });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#ecfdf5", fontSize: 14 }}>
        Thank you for your feedback.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#f9fafb", fontSize: 14 }}>
      <p style={{ fontWeight: 600, marginBottom: 8 }}>
        Which results felt more relevant to you?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        <label>
          <input
            type="radio"
            name="eval-preference"
            value="left"
            onChange={() => setChoice("left")}
          />{" "}
          Left column
        </label>
        <label>
          <input
            type="radio"
            name="eval-preference"
            value="middle"
            onChange={() => setChoice("middle")}
          />{" "}
          Middle column
        </label>
        <label>
          <input
            type="radio"
            name="eval-preference"
            value="right"
            onChange={() => setChoice("right")}
          />{" "}
          Right column
        </label>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment (e.g., what you liked or missed)"
        rows={2}
        style={{ width: "100%", marginBottom: 8, fontSize: 13 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn-primary"
          type="button"
          onClick={handleSubmit}
          disabled={!choice || submitting}
        >
          {submitting ? "Sending..." : "Send feedback"}
        </button>
      </div>
    </div>
  );
}
