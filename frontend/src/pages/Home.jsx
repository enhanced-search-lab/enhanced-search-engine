import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchPapersPOST } from "../services/api";
import Statistics from '../components/Statistics';
import ResearchDiscovery from '../components/ResearchDiscovery';

export default function Home() {
  const navigate = useNavigate();

  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState("");
  const [abstracts, setAbstracts] = useState([""]);
  const [loading, setLoading] = useState(false);

  const commitKw = (raw) => {
    const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setKeywords(prev => Array.from(new Set([...prev, ...parts])));
    setKwInput("");
  };
  const onKwKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitKw(kwInput); }
    else if (e.key === "Backspace" && !kwInput && keywords.length) {
      setKeywords(prev => prev.slice(0, -1));
    }
  };
  const removeKw = (k) => setKeywords(prev => prev.filter(x => x !== k));

  const updateAbstract = (i, v) => setAbstracts(arr => arr.map((a, idx) => idx === i ? v : a));
  const addAbstract = () => setAbstracts(arr => [...arr, ""]);

  const onSearch = async (e) => {
    e.preventDefault();
    const cleanAbstracts = abstracts.map(a => (a || "").trim()).filter(Boolean);
    if (!keywords.length && !cleanAbstracts.length) {
      alert("Please add at least one keyword or one abstract."); return;
    }
    setLoading(true);
    try {
      const data = await searchPapersPOST({ keywords, abstracts: cleanAbstracts, page: 1, per_page: 12 });
      const request = { keywords, abstracts: cleanAbstracts };
      sessionStorage.setItem("lastSearch", JSON.stringify({ request, data }));
      navigate("/search", { state: { request, data } });
    } catch (err) {
      console.error("[Search] failed:", err);
      alert("Search failed. Check console for details.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <section className="hero bg-dots">
        <div className="container">
          <h1>Discover the Most Relevant <span className="accent">Research Articles</span> Instantly</h1>
          <p>Paste an abstract or enter keywords to explore top matches from millions of academic papers.</p>
        </div>
      </section>

      <section style={{marginTop:-24}}>
        <form onSubmit={onSearch} className="card">
          <div className="field-label">Keywords</div>
          <div className="chips">
            {keywords.map(k => (
              <span className="chip" key={k}>
                {k}
                <button type="button" onClick={() => removeKw(k)}>×</button>
              </span>
            ))}
          </div>
          <input
            className="input"
            placeholder="Type keywords and press Enter…"
            value={kwInput}
            onChange={(e)=>setKwInput(e.target.value)}
            onKeyDown={onKwKeyDown}
            onBlur={()=>commitKw(kwInput)}
          />

          <div className="field-label">Abstracts</div>
          {abstracts.map((val,i)=>(
            <textarea
              key={i}
              className="textarea"
              placeholder="Paste your research abstract here…"
              value={val}
              onChange={(e)=>updateAbstract(i, e.target.value)}
              style={{marginBottom:10}}
            />
          ))}
          <button type="button" className="link-sm" onClick={addAbstract}>+ Add another abstract</button>

          <div style={{marginTop:18}}>
            <button type="submit" className="btn-primary" disabled={loading}>
              🔎 {loading ? "Searching…" : "Search Research Papers"}
            </button>
          </div>
        </form>
      </section>

      <section className="container" style={{ marginBottom: 40 }}>
        <Statistics />
      </section>

      <section className="container" style={{ marginBottom: 80 }}>
        <ResearchDiscovery />
      </section>
    </>
  );
}
