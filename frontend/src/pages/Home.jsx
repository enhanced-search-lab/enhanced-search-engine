import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchPapersPOST, searchOpenAlexKeywordPOST } from "../services/api";
import Statistics from '../components/Statistics';
import ResearchDiscovery from '../components/ResearchDiscovery';

export default function Home() {
  const navigate = useNavigate();

  const [keywords, setKeywords] = useState([]);
  const [kwInput, setKwInput] = useState("");
  const [abstracts, setAbstracts] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [yearError, setYearError] = useState("");
  const [isYearValid, setIsYearValid] = useState(true);

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
      // Ana embedding tabanlı arama (asıl sıralama buradan geliyor)
      const payload = { keywords, abstracts: cleanAbstracts, page: 1, per_page: 30 };
      if (yearMin) payload.year_min = Number(yearMin);
      if (yearMax) payload.year_max = Number(yearMax);
      const data = await searchPapersPOST(payload);

  const request = { keywords, abstracts: cleanAbstracts };
  if (yearMin) request.year_min = Number(yearMin);
  if (yearMax) request.year_max = Number(yearMax);
      sessionStorage.setItem("lastSearch", JSON.stringify({ request, data }));

      // SearchPage'in hem embed hem raw OpenAlex aramasını tetiklemesi için
      // aynı query'yi URL parametrelerine yaz.
      const params = new URLSearchParams();
  cleanAbstracts.forEach((a) => params.append("abstract", a));
  if (keywords.length) params.set("keywords", keywords.join(","));
  if (yearMin) params.set("year_min", String(yearMin));
  if (yearMax) params.set("year_max", String(yearMax));
      params.set("page", "1");

      navigate(`/search?${params.toString()}`, { state: { request, data } });
    } catch (err) {
      console.error("[Search] failed:", err);
      alert("Search failed. Check console for details.");
    } finally { setLoading(false); }
  };

  // live validation for Home year inputs
  useEffect(() => {
    setYearError("");
    setIsYearValid(true);
    const curYear = new Date().getFullYear();
    const minVal = yearMin !== '' ? Number(yearMin) : null;
    const maxVal = yearMax !== '' ? Number(yearMax) : null;

    if (minVal !== null && (Number.isNaN(minVal) || minVal < 1900 || minVal > curYear)) {
      setYearError(`Min year must be between 1900 and ${curYear}`);
      setIsYearValid(false);
      return;
    }
    if (maxVal !== null && (Number.isNaN(maxVal) || maxVal < 1900 || maxVal > curYear)) {
      setYearError(`Max year must be between 1900 and ${curYear}`);
      setIsYearValid(false);
      return;
    }
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      setYearError('Min year cannot be greater than max year');
      setIsYearValid(false);
      return;
    }
  }, [yearMin, yearMax]);

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
          <div className="field-label" title="Keywords — separate multiple with commas">Keywords</div>
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

          

          <div className="field-label" title="Paste one or more abstracts to search">Abstracts</div>
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
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              title="Add another abstract"
              onClick={addAbstract}
              className="link-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                color: "#4f46e5",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "999px",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                +
              </span>
              <span>Add another abstract</span>
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="field-label" title="Publication year — single year or range. Leave empty to disable">Year filter</div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              placeholder="min"
              className="input"
              style={{ width: 72, padding: '6px 8px', fontSize: 13 }}
              value={yearMin}
              onChange={(e) => setYearMin(e.target.value)}
            />
            <span style={{ color: '#6b7280' }}>—</span>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              placeholder="max"
              className="input"
              style={{ width: 72, padding: '6px 8px', fontSize: 13 }}
              value={yearMax}
              onChange={(e) => setYearMax(e.target.value)}
            />
            <button type="button" title="Clear year inputs" className="link-sm" onClick={() => { setYearMin(''); setYearMax(''); }} style={{ marginLeft: 8 }}>Clear</button>
          </div>
          </div>
          {yearError && <div style={{ color: '#b91c1c', marginTop: 8, fontSize: 13 }}>{yearError}</div>}
          <div style={{marginTop:64}}>
            <button type="submit" className="btn-primary" disabled={loading || !isYearValid} title="Search — find matching papers based on your inputs">
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
