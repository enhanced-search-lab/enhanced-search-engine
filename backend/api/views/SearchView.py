from typing import List, Dict

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ..response_serializers.SearchRequestSerializer import SearchRequestSerializer
from ..response_serializers.PaperSerializer import PaperResponseSerializer
from drf_spectacular.utils import extend_schema

import requests

from app.services.openalex_multi_abstract import rerank_openalex_for_abstracts


@extend_schema(
    request=SearchRequestSerializer,
    responses=PaperResponseSerializer(many=True),  # paginated wrapper in UI, items are Paper
    description="Search for similar papers using multiple abstracts/keywords via OpenAlex + Gemini + embedding re-rank (no Qdrant)."
)
class PaperSearchView(APIView):
    """
    POST /api/search/?page=N&per_page=M
    Body JSON: { "abstracts": [...], "keywords": [...], "year_min": 2020, "year_max": 2024 }

    Behavior:
      - Generate query keywords for each abstract (Gemini + heuristic)
      - Call OpenAlex with progressive relaxation to fetch candidate works
      - Build embeddings for each query abstract and each candidate work
      - Re-rank candidate works by total similarity
      - Map OpenAlex works to frontend format and attach scores
      - Return { count, next, previous, results, query_summary }
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # 1) Validate request body
        s = SearchRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        abstracts = s.validated_data.get("abstracts", []) or []
        keywords = s.validated_data.get("keywords", []) or []
        year_min = s.validated_data.get("year_min")  # Şu an pipeline'da kullanılmıyor
        year_max = s.validated_data.get("year_max")  # Şu an pipeline'da kullanılmıyor

        if not abstracts and not keywords:
            return Response(
                {"detail": "At least one of 'abstracts' or 'keywords' must be provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Pagination (?page, ?per_page)
        try:
            page = int(request.query_params.get("page", 1))
        except ValueError:
            page = 1
        try:
            per_page = int(request.query_params.get("per_page", 30))  # Default increased to 30
        except ValueError:
            per_page = 30

        page = max(1, page)
        per_page = max(1, min(per_page, 200))

        # 3) Semantic search: OpenAlex + Gemini + embedding re-rank (Qdrant yok)
        try:
            # keywords listesi → raw string
            user_keywords_raw = ";".join([k for k in keywords if k.strip()])

            # TOP_K: pagination için bir üst sınır (en az sayfa*per_page, en az 300)
            TOP_K = max(page * per_page, 300)

            scored = rerank_openalex_for_abstracts(
                abstracts=abstracts,
                user_keywords_raw=user_keywords_raw,
                per_group=30,
                top_k=TOP_K,
            )
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Upstream error contacting OpenAlex: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            return Response(
                {"detail": f"Semantic search error: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not scored:
            ser = PaperResponseSerializer([], many=True)
            return Response({
                "count": 0,
                "next": None,
                "previous": None,
                "results": ser.data,
                "query_summary": {
                    "abstracts_count": len([a for a in abstracts if a.strip()]),
                    "keywords_count": len([k for k in keywords if k.strip()]),
                    "page": page,
                    "per_page": per_page,
                },
            })

        # scored: [{ "total_score", "per_abstract_sims", "per_abstract_contribs", "work" }, ...]
        total_count = len(scored)

        # Basit pagination: scored listesini slice et
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        page_slice = scored[start_idx:end_idx]

        items = []
        max_score = page_slice[0]["total_score"] if page_slice else 1.0

        for entry in page_slice:
            total_sim = entry["total_score"]
            sims = entry["per_abstract_sims"]
            contribs = entry["per_abstract_contribs"]
            work = entry["work"]

            item = self.to_item(work)     
            item["score"] = total_sim

            # Eğer UI'da göstermek istersen:
            item["per_abstract_sims"] = sims
            item["per_abstract_contribs"] = [round(c * 100, 1) for c in contribs]  # % cinsinden
            item["total_score"] = total_sim  # Ensure total_score is included in the response

            items.append(item)

        ser = PaperResponseSerializer(items, many=True)
        return Response({
            "count": total_count,
            "next": None,      
            "previous": None,
            "results": ser.data,
            "query_summary": {
                "abstracts_count": len([a for a in abstracts if a.strip()]),
                "keywords_count": len([k for k in keywords if k.strip()]),
                "page": page,
                "per_page": per_page,
            },
        })

    # === Mapping helpers ===

    def to_item(self, w: dict) -> dict:
        """Maps an OpenAlex work object to the frontend-friendly format."""
        host_venue       = w.get("host_venue") or {}
        primary_location = w.get("primary_location") or {}
        primary_source   = primary_location.get("source") or {}
        open_access      = w.get("open_access") or {}
        best_oa_location = w.get("best_oa_location") or {}
        authorships      = w.get("authorships") or []

        # Authors
        authors = []
        for a in authorships:
            a_author = a.get("author") or {}
            name = a_author.get("display_name") or ""
            if name:
                authors.append(name)

        # Ensure short_id is valid before constructing the URL
        short_id = (w.get("id") or "").rsplit("/", 1)[-1]
        url = f"https://openalex.org/{short_id}" if short_id else ""

        # Abstract normalization
        abstract_field = w.get("abstract")
        if not abstract_field:
            inv = w.get("abstract_inverted_index")
            abstract_field = self.reconstruct_abstract(inv) if inv else ""

        # Concepts (cap to 10)
        concepts = []
        for c in (w.get("concepts") or [])[:10]:
            name = (c or {}).get("display_name")
            if name:
                concepts.append(name)

        cited_by_count   = w.get("cited_by_count", 0)
        references_count = len(w.get("referenced_works") or [])

        # id'yi kısa formda tut (W1234567)
        short_id = (w.get("id") or "").rsplit("/", 1)[-1]

        return {
            "id": short_id,
            "title": w.get("display_name") or "",
            "abstract": abstract_field,
            "url": url,
            "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
            "venue": host_venue.get("display_name") or "",
            "year": w.get("publication_year"),
            "authors": authors,
            "authors_text": ", ".join(authors[:6]),
            "concepts": concepts,
            "tags": [],
            "relevance_pct": None,  
            "score": None,          
            "cited_by_count": cited_by_count,
            "references_count": references_count,
            "is_open_access": bool(open_access.get("is_oa")),
            "oa_status": open_access.get("oa_status") or "",
            "oa_url": best_oa_location.get("url") or "",
            "created_at": w.get("created_date"),
        }

    def reconstruct_abstract(self, inv):
        """Turn OpenAlex abstract_inverted_index into a readable string."""
        if not isinstance(inv, dict):
            return inv or ""

        pairs = []
        for token, positions in inv.items():
            for p in positions:
                pairs.append((p, token))
        if not pairs:
            return ""
        pairs.sort(key=lambda x: x[0])
        return " ".join(word for _, word in pairs)
