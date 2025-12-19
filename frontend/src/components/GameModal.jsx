import React, { useEffect } from "react";

export default function GameModal({ open, onClose, loading = false }) {
  useEffect(() => {
    if (open) console.log("GameModal: opened, loading=", loading);
    return () => {
      if (open) console.log("GameModal: closed");
    };
  }, [open]);

  if (!open) return null;

  // Compute a square size so the in-iframe game (which expects a square #game)
  // doesn't get clipped. Leave a small margin from the viewport edges.
  const maxSize = 820; // the game's base target
  const margin = 80;
  const size = Math.min(window.innerWidth - margin, window.innerHeight - margin, maxSize);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: size, height: size, background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#111827", color: "#fff" }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Play while results load</div>
            {loading && (
              <div style={{ fontSize: 13, color: '#d1fae5', background: '#064e3b', padding: '6px 8px', borderRadius: 8 }} title="Results are still loading in the background">
                Results loading…
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, cursor: "pointer" }} title="Close the game and continue waiting">✕</button>
        </div>
        <iframe src="/game.html" title="Mini game" style={{ width: "100%", height: `calc(100% - 40px)`, border: "none" }} />
      </div>
    </div>
  );
}
