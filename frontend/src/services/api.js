// src/services/api.js
export const API =
  (import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://127.0.0.1:8000/api";

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
  per_page = 12,
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

// frontend/src/services/api.js



// services/api.js

// services/api.js

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
    const msg =
      (data && (data.detail || data.error || data.message)) ||
      `Server error (${res.status})`;
    throw new Error(msg);
  }

  return data || { status: "ok" };
}