// src/services/api.js
export const API =
  (import.meta.env && import.meta.env.VITE_API_URL) ||
  "/api";


/**
 * POST /api/search/?page=N&per_page=M
 * body: { abstracts?: string[], keywords?: string[], year_min?, year_max? }
 * returns: { count, next, previous, results[], query_summary }
 */
export async function searchPapersPOST({
  abstracts = [],
  keywords = [],
  year_min,
  year_max,
  page = 1,
  per_page = 30,
} = {}) {
  const body = {};
  if (abstracts?.length) body.abstracts = abstracts;
  if (keywords?.length) body.keywords = keywords;
  if (typeof year_min === "number") body.year_min = year_min;
  if (typeof year_max === "number") body.year_max = year_max;

  const res = await fetch(`${API}/search/?page=${page}&per_page=${per_page}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Search failed (${res.status}): ${text}`);
  }
  return res.json();
}

// Raw OpenAlex keyword-only search for comparison/debugging.
// POST /api/openalex-keyword-search/
// body: { keywords: string[] | string, per_page?: number }
// returns: { query, keywords, count, results[] }
export async function searchOpenAlexKeywordPOST({
  keywords = [],
  per_page = 30,
  year_min,
  year_max,
} = {}) {
  const body = { keywords, per_page };
  if (typeof year_min === 'number') body.year_min = year_min;
  if (typeof year_max === 'number') body.year_max = year_max;

  const res = await fetch(`${API}/openalex-keyword-search/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAlex keyword search failed (${res.status}): ${text}`);
  }

  return res.json();
}

// OpenAlex search based on Gemini-extracted phrases from abstracts + user keywords.
// POST /api/openalex-gemini-keyword-search/
// body: { abstracts: string[] | string, keywords: string[] | string, per_page?: number }
// returns: { count, results[], query: { abstracts, keywords } }
export async function searchOpenAlexGeminiPOST({
  abstracts = [],
  keywords = [],
  per_page = 30,
  year_min,
  year_max,
} = {}) {
  const body = { abstracts, keywords, per_page };
  if (typeof year_min === 'number') body.year_min = year_min;
  if (typeof year_max === 'number') body.year_max = year_max;

  const res = await fetch(`${API}/openalex-gemini-keyword-search/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAlex Gemini keyword search failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function subscribeToSearch(payload) {
  const res = await fetch(`${API}/subscribe-search/`, {
    method: "POST",                                // ✅ POST
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),                // ✅ abstracts & keywords in body
  });

  const raw = await res.text(); // read once

  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Non-JSON response from /subscribe-search/:", raw);
  }

  if (!res.ok) {
    const extractMessage = (d) => {
      if (!d) return `Server error (${res.status})`;
      if (typeof d === "string") return d;
      if (d.detail) return d.detail;
      if (d.error) return d.error;
      if (d.message) return d.message;
      // DRF serializer errors often come as { "non_field_errors": ["..."] } or { "field": ["..."] }
      if (d.non_field_errors) {
        return Array.isArray(d.non_field_errors)
          ? d.non_field_errors.join("; ")
          : String(d.non_field_errors);
      }
      // If it's a dict of field errors, join first messages
      if (typeof d === "object") {
        const parts = [];
        for (const k of Object.keys(d)) {
          const v = d[k];
          if (Array.isArray(v)) parts.push(`${k}: ${v.join("; ")}`);
          else parts.push(`${k}: ${String(v)}`);
        }
        if (parts.length) return parts.join(" | ");
      }
      return `Server error (${res.status})`;
    };

    const msg = extractMessage(data);
    throw new Error(msg);
  }

  return data || { status: "ok" };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getSubscriptionsByToken(token) {
  const res = await fetch(`${API_BASE}/api/subscriber/subscriptions/?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load subscriptions (${res.status}): ${text}`);
  }
  return res.json();
}

export async function unsubscribeSubscription(id, token) {
  const res = await fetch(
    `${API_BASE}/api/subscriptions/${id}/unsubscribe/?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
    }
  );
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to unsubscribe (${res.status}): ${text}`);
  }
  return true;
}

export async function deleteSubscription(id, token) {
  const res = await fetch(
    `${API_BASE}/api/subscriptions/${id}/delete/?token=${encodeURIComponent(token)}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to delete subscription (${res.status}): ${text}`);
  }
  return true;
}

export async function toggleSubscriptionActive(id, token) {
  const res = await fetch(
    `${API_BASE}/api/subscriptions/${id}/toggle-active/?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to toggle subscription state (${res.status}): ${text}`);
  }

  return res.json();
}

// GoodMatch endpoints (for "marked as good match" items from weekly emails)
export async function getGoodMatches(token) {
  const res = await fetch(`${API_BASE}/api/goodmatches/?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load good matches (${res.status}): ${text}`);
  }
  return res.json(); // { good_matches: [] }
}

export async function deleteGoodMatch(id, token) {
  const res = await fetch(
    `${API_BASE}/api/goodmatches/${id}/delete/?token=${encodeURIComponent(token)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete good match (${res.status}): ${text}`);
  }
  return res.json();
}
// POST /api/eval-feedback/
// body: { query: { abstracts, keywords }, choice: "left"|"right"|"both"|"none", comment?: string }
export async function sendEvalFeedback(payload) {
  const res = await fetch(`${API}/eval-feedback/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text().catch(() => "");
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    // non-JSON response is fine, treat as generic ok
  }

  if (!res.ok) {
    throw new Error(data?.detail || `Eval feedback failed (${res.status})`);
  }

  return data || { status: "ok" };
}
