import React, { useState } from "react";
import EditQueryModal from "./modals/EditQueryModal";
import SubscribeModal from "./modals/SubscribeModal";

export default function QuerySummary({ query, resultCount, summary, onQueryUpdate }) {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isSubscribeModalOpen, setSubscribeModalOpen] = useState(false);

  const abstracts = query?.abstracts || [];
  const keywords = query?.keywords || [];
  const page = summary?.page ?? 1;
  const per = summary?.per_page ?? 12;
  const start = Math.min(resultCount ?? 0, (page - 1) * per + 1);
  const end = Math.min(resultCount ?? 0, page * per);

  return (
    <>
      <section className="results-head">
        <div className="head-actions">
          <button className="btn-ghost" onClick={()=>setEditModalOpen(true)}>Edit query</button>
          <button className="btn-ghost" onClick={()=>setSubscribeModalOpen(true)}>Subscribe to this query</button>
        </div>

        <div>
          {!!abstracts.length && (
            <>
              <div style={{fontWeight:700, opacity:.95, marginBottom:8}}>Abstracts</div>
              <div style={{display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))"}}>
                {abstracts.map((abs,i)=>(
                  <div key={i} style={{background:"#ffffff22", padding:14, borderRadius:12, backdropFilter:"blur(2px)"}}>
                    <div style={{fontSize:12, opacity:.9, marginBottom:4}}>Abstract #{i+1}</div>
                    <div style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{abs}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!!keywords.length && (
            <div style={{marginTop:12, display:"inline-block", background:"#ffffff22", padding:12, borderRadius:12}}>
              <div style={{fontSize:12, opacity:.9, marginBottom:4}}>Keywords</div>
              <div style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{keywords.join(", ")}</div>
            </div>
          )}

          <p style={{marginTop:16, opacity:.9}}>
            Showing {start}-{end} of {resultCount ?? 0} results<br/>
            Search simulated with {summary?.abstracts_count ?? abstracts.length} abstract{(summary?.abstracts_count ?? abstracts.length)===1?"":"s"} and {summary?.keywords_count ?? keywords.length} keyword{(summary?.keywords_count ?? keywords.length)===1?"":"s"}.
          </p>
        </div>
      </section>

      <EditQueryModal
        isOpen={isEditModalOpen}
        onClose={()=>setEditModalOpen(false)}
        currentQuery={{ abstracts, keywords }}
        onApply={onQueryUpdate}
      />
      <SubscribeModal isOpen={isSubscribeModalOpen} onClose={()=>setSubscribeModalOpen(false)} />
    </>
  );
}
