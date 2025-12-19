import React from "react";
import { Link, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError?.() || {};
  // Log for developers (safe); in production this will still be helpful in console
  // but we avoid rendering raw stacks in the UI.
  console.error("Router error:", error);

  return (
    <div style={{ padding: 28, maxWidth: 880, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginBottom: 8 }}>Unexpected application error</h1>
      <p style={{ marginTop: 0, color: "#444" }}>
        Something went wrong while rendering this page.
      </p>
      <div style={{ marginTop: 12 }}>
        {error?.status && <div style={{ color: '#666', marginBottom: 8 }}>Error code: {String(error.status)}</div>}
        {error?.statusText && <div style={{ color: '#666', marginBottom: 8 }}>{error.statusText}</div>}
        <div style={{ marginTop: 12 }}>
          <Link to="/" style={{ padding: "10px 14px", background: "#111827", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
            Go back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
