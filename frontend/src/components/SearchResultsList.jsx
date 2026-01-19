import React from "react";
import PaperCard from "./PaperCard";
import { useState } from "react";

const LoadingSkeleton = () => (
  <div>
    {[...Array(3)].map((_, i) => (
      <div key={i} style={{
        background:"#fff", border:"1px solid #e2e8f0", borderRadius:18, padding:20, marginBottom:16,
        animation:"pulse 1.2s infinite ease-in-out"
      }}>
        <div style={{height:24, background:"#e5e7eb", borderRadius:6, width:"70%", marginBottom:12}} />
        <div style={{height:16, background:"#e5e7eb", borderRadius:6, width:"40%", marginBottom:10}} />
        <div style={{height:14, background:"#e5e7eb", borderRadius:6, width:"95%", marginBottom:6}} />
        <div style={{height:14, background:"#e5e7eb", borderRadius:6, width:"65%"}} />
      </div>
    ))}
    <style>{`@keyframes pulse{0%{opacity:.6}50%{opacity:.35}100%{opacity:.6}}`}</style>
  </div>
);

const ErrorDisplay = ({ message }) => (
  <div style={{padding:16, background:"#fef2f2", border:"1px solid #fecaca", color:"#7f1d1d", borderRadius:12}}>
    {message}
  </div>
);

// hideSimilarity: evaluation modunda kart üzerindeki similarity badge'ini gizlemek için opsiyonel flag
export default function SearchResultsList({ results = [], loading, error, hideSimilarity = false, compact = false }) {
  const [ranks, setRanks] = useState({}); // {paperId: rank}

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay message={error} />;
  if (!results.length) return <p style={{textAlign:"center", color:"6b7280", marginTop:24}}>No results found.</p>;

  // Sadece 1, 2, 3 kullanılabilsin, aynı rank birden fazla makaleye atanamasın
  const usedRanks = Object.values(ranks);
  const handleRankChange = (paperId, newRank) => {
    setRanks(prev => {
      // Aynı rank başka makaleye atanmışsa onu kaldır
      const updated = { ...prev };
      Object.keys(updated).forEach(pid => {
        if (updated[pid] === newRank) updated[pid] = null;
      });
      updated[paperId] = newRank;
      return updated;
    });
  };

  return (
    <div className={compact ? 'eval-compact' : ''} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {results.map((paper) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          hideSimilarity={hideSimilarity}
          compact={compact}
          rank={ranks[paper.id] || ''}
          onRankChange={rank => handleRankChange(paper.id, rank)}
          rankDisabled={usedRanks.includes(1) && ranks[paper.id] !== 1 && rank === 1}
        />
      ))}
    </div>
  );
}
