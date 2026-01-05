// // src/services/api.js

/**
 * Single source of truth for API base.
 * - In Docker/Nginx proxy setups, keep it relative: "/api"
 * - You can override with VITE_API_BASE_URL or VITE_API_URL
 */
const API_BASE_RAW =
  (import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)) ||
  "/api";

// Normalize: no trailing slash
export const API_BASE = String(API_BASE_RAW).replace(/\/+$/, "");

/**
 * Join base + path safely so we never produce "/api/api/..." or double slashes.
 * joinApi("/api", "/search/") => "/api/search/"
 * joinApi("/api/", "subscriber/subscriptions/") => "/api/subscriber/subscriptions/"
 */
function joinApi(path) {
  const p = String(path || "").replace(/^\/+/, ""); // remove leading slashes
  return `${API_BASE}/${p}`;
}

// ---------- Search ----------

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

  const url = `${joinApi("search/")}?page=${page}&per_page=${per_page}`;

  const res = await fetch(url, {
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
  if (typeof year_min === "number") body.year_min = year_min;
  if (typeof year_max === "number") body.year_max = year_max;

  const res = await fetch(joinApi("openalex-keyword-search/"), {
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
export async function searchOpenAlexGeminiPOST({
  abstracts = [],
  keywords = [],
  per_page = 30,
  year_min,
  year_max,
} = {}) {
  const body = { abstracts, keywords, per_page };
  if (typeof year_min === "number") body.year_min = year_min;
  if (typeof year_max === "number") body.year_max = year_max;

  const res = await fetch(joinApi("openalex-gemini-keyword-search/"), {
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

// ---------- Subscriptions ----------

/**
 * POST /api/subscribe-search/
 * body: { email, query_name, agree_to_emails, abstracts, keywords, ... }
 */
export async function subscribeToSearch(payload) {
  const res = await fetch(joinApi("subscribe-search/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text().catch(() => "");

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
      if (d.non_field_errors) {
        return Array.isArray(d.non_field_errors)
          ? d.non_field_errors.join("; ")
          : String(d.non_field_errors);
      }
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

    throw new Error(extractMessage(data));
  }

  return data || { status: "ok" };
}

/**
 * GET /api/subscriber/subscriptions/?token=...
 */
export async function getSubscriptionsByToken(token) {
  const url = `${joinApi("subscriber/subscriptions/")}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load subscriptions (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * POST /api/subscriptions/<id>/unsubscribe/?token=...
 */
export async function unsubscribeSubscription(id, token) {
  const url = `${joinApi(`subscriptions/${id}/unsubscribe/`)}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to unsubscribe (${res.status}): ${text}`);
  }
  return true;
}

/**
 * DELETE /api/subscriptions/<id>/delete/?token=...
 */
export async function deleteSubscription(id, token) {
  const url = `${joinApi(`subscriptions/${id}/delete/`)}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "DELETE" });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete subscription (${res.status}): ${text}`);
  }
  return true;
}

/**
 * POST /api/subscriptions/<id>/toggle-active/?token=...
 */
export async function toggleSubscriptionActive(id, token) {
  const url = `${joinApi(`subscriptions/${id}/toggle-active/`)}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "POST" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to toggle subscription state (${res.status}): ${text}`);
  }
  return res.json();
}

// ---------- GoodMatch endpoints ----------

/**
 * GET /api/goodmatches/?token=...
 */
export async function getGoodMatches(token) {
  const url = `${joinApi("goodmatches/")}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load good matches (${res.status}): ${text}`);
  }
  return res.json(); // { good_matches: [] } (veya backend formatın neyse)
}

/**
 * DELETE /api/goodmatches/<id>/delete/?token=...
 */
export async function deleteGoodMatch(id, token) {
  const url = `${joinApi(`goodmatches/${id}/delete/`)}?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { method: "DELETE" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete good match (${res.status}): ${text}`);
  }
  return res.json();
}

// ---------- Eval feedback ----------

/**
 * POST /api/eval-feedback/
 * body: { query: { abstracts, keywords }, choice: "left"|"right"|"both"|"none", comment?: string }
 */
export async function sendEvalFeedback(payload) {
  const res = await fetch(joinApi("eval-feedback/"), {
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
