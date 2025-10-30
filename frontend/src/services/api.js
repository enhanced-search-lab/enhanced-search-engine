// import { mockPapers } from '../data/mockPapers';

// // Bu bir mock API servisidir.
// // Kullanıcının isteği üzerine, herhangi bir sorgu veya filtreleme yapmadan
// // her zaman tüm mock verilerini döndürecektir.

// export const searchPapers = async (query) => {
//     console.log("Always returning all mock papers, ignoring query:", query);

//     // Ağ gecikmesini simüle et
//     await new Promise(resolve => setTimeout(resolve, 750));

//     // Kullanıcının isteği üzerine, herhangi bir filtreleme yapmadan tüm mock verilerini döndür.
//     // Sadece mevcut 'rel' skoruna göre sıralama yap.
//     const sortedPapers = [...mockPapers].sort((a, b) => b.rel - a.rel);

//     return sortedPapers;
// };

// src/services/api.js
// src/services/api.js
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";


/**
 * POST /api/search/ with long abstracts + keywords in the JSON body.
 * Returns { count, next, previous, results }.
 */
export async function searchPapersPOST({
  abstracts = [],
  keywords = [],
  year_min,
  year_max,
  page = 1,
  per_page = 12,
}) {
  const body = {};
  if (abstracts.length) body.abstracts = abstracts;
  if (keywords.length)  body.keywords  = keywords;
  if (year_min != null) body.year_min  = Number(year_min);
  if (year_max != null) body.year_max  = Number(year_max);

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

