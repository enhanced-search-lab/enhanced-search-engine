import React, { useEffect, useState } from "react";

// Multi-stage progress bar for search loading
function MultiStageProgressBar({ stages }) {
  // Fill each stage only when the corresponding async is done
  const total = stages.length;
  const currentIdx = stages.findIndex(s => !s.done);
  return (
    <div style={{ width: 220, height: 22, background: '#1e293b', borderRadius: 12, overflow: 'hidden', marginLeft: 12, display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px #0002' }} title="Results loading…">
      {stages.map((s, i) => {
        const isCurrent = i === currentIdx;
        const isDone = s.done;
        // Home sayfasında OpenAlex ve Gemini aşamaları pasif ise, tooltip ile açıklama göster
        const isHomePassive = !isDone && !isCurrent && (s.label === 'OpenAlex' || s.label === 'Gemini');
        // Completed: green/blue, Current: animated red, Pending: gray
        let bg = isDone
          ? 'linear-gradient(90deg,#34d399,#3b82f6)'
          : isCurrent
          ? '#ef4444'
          : '#334155';
        let color = isDone ? '#fff' : isCurrent ? '#fff' : '#a5b4fc';
        let fontWeight = isCurrent || isDone ? 700 : 500;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: bg,
              color,
              fontWeight,
              fontSize: 13,
              borderRight: i < total - 1 ? '2px solid #1e293b' : 'none',
              position: 'relative',
              transition: 'background 0.4s, color 0.4s',
              letterSpacing: 0.2,
              boxShadow: isCurrent ? '0 0 8px #ef4444cc' : undefined,
              cursor: isHomePassive ? 'help' : undefined
            }}
            title={isHomePassive ? `${s.label} aşaması Home sayfasında çalışmaz. Sadece arama sonuçlarında aktif olur.` : undefined}
          >
            {s.label}
            {isCurrent && (
              <>
                {/* Animated fill bar for current stage */}
                <span style={{
                  position: 'absolute',
                  left: 0, top: 0, height: '100%', width: '100%',
                  background: 'linear-gradient(90deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.38) 50%,rgba(255,255,255,0.18) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'stageFillMove 1.8s linear infinite',
                  zIndex: 1,
                  pointerEvents: 'none',
                  borderRadius: 12
                }} />
                {/* Subtle pulse for current stage */}
                <span style={{
                  position: 'absolute',
                  left: 0, top: 0, width: '100%', height: '100%',
                  background: 'rgba(239,68,68,0.10)',
                  animation: 'stagePulse 1.2s infinite',
                  zIndex: 2,
                  pointerEvents: 'none',
                  borderRadius: 12
                }} />
              </>
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes stagePulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @keyframes stageFillMove {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// Accepts loading stages as props for progress bar
export default function GameModal({ open, onClose, loading = false, loadingStages }) {
  const isDev = !!(import.meta?.env && import.meta.env.DEV);

  useEffect(() => {
    if (isDev && open) console.log("GameModal: opened, loading=", loading);
    return () => {
      if (isDev && open) console.log("GameModal: closed");
    };
  }, [open, loading, isDev]);

  if (!open) return null;

  // Compute a square size so the in-iframe game (which expects a square #game)
  // doesn't get clipped. Leave a small margin from the viewport edges.
  const maxSize = 820; // the game's base target
  const margin = 32; // daha az margin, daha fazla alan
  const headerHeight = 60; // üst bar ve başlık için tahmini yükseklik
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  // Modal yüksekliği, header + oyun olacak şekilde ayarlanıyor
  const size = Math.max(320, Math.min(vw - margin, vh - margin, maxSize));
  const gameHeight = size - headerHeight;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: size, height: size, background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: headerHeight, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: "#111827", color: "#fff" }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Play while results load</div>
            {loadingStages && loadingStages.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <MultiStageProgressBar stages={loadingStages} />
                  <div style={{ fontSize: 11, color: '#64748b', marginLeft: 2, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span><span style={{display:'inline-block',width:14,height:10,background:'#ef4444',borderRadius:2,marginRight:3,verticalAlign:'middle'}}></span>Processing</span>
                    <span><span style={{display:'inline-block',width:14,height:10,background:'linear-gradient(90deg,#34d399,#3b82f6)',borderRadius:2,marginRight:3,verticalAlign:'middle'}}></span>Done</span>
                    <span><span style={{display:'inline-block',width:14,height:10,background:'#334155',borderRadius:2,marginRight:3,verticalAlign:'middle'}}></span>Pending</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, cursor: "pointer" }} title="Close the game and continue waiting">✕</button>
        </div>
        <iframe src="/game.html" title="Mini game" style={{ width: "100%", height: gameHeight, border: "none", display: 'block' }} />
      </div>
    </div>
  );
}
