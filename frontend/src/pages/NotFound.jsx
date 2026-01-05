import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ padding: 28, maxWidth: 880, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginBottom: 8 }}>404 — Page not found</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        The page you’re looking for doesn’t exist.
      </p>
      <div style={{ marginTop: 12 }}>
        <Link
          to="/"
          style={{
            padding: "10px 14px",
            background: "#111827",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Go back to home
        </Link>
      </div>
    </div>
  );
}
