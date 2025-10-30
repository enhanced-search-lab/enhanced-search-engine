from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ..response_serializers.SearchRequestSerializer import SearchRequestSerializer
from ..response_serializers.PaperSerializer import PaperResponseSerializer
from drf_spectacular.utils import extend_schema

import requests
import urllib.parse

# Base URL for OpenAlex "works" API
OPENALEX_BASE = "https://api.openalex.org/works"


@extend_schema(
    request=SearchRequestSerializer,
    responses=PaperResponseSerializer(many=True),  # paginated wrapper in UI, items are Paper
    description="Search papers using long abstracts and/or keywords. Use ?page=N for pagination."
)
class PaperSearchView(APIView):
    """
    POST /api/search/?page=N&per_page=M
    Body JSON: { "abstracts": [...], "keywords": [...], "year_min": 2020, "year_max": 2024 }

    Behavior:
      - Validate the JSON body
      - Build a 'search' query for OpenAlex (title/abstract/fulltext)
      - Optionally add year filters
      - Call OpenAlex /works
      - Map OpenAlex results to a frontend-friendly shape
      - Return a DRF-like paginated object: { count, next, previous, results, query_summary }
    """

    # no auth → no CSRF requirement for POST
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # 1) Validate request body
        s = SearchRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        # 2) Extract inputs
        abstracts = s.validated_data.get('abstracts', []) or []
        keywords = s.validated_data.get('keywords', []) or []
        year_min = s.validated_data.get('year_min')
        year_max = s.validated_data.get('year_max')

        if not abstracts and not keywords:
            return Response(
                {"detail": "At least one of 'abstracts' or 'keywords' must be provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build a single OpenAlex search string
        tokens = []
        tokens.extend(abstracts)
        tokens.extend(keywords)
        search_string = ' '.join(t.strip() for t in tokens if t.strip())

        # 3) Pagination (?page, ?per_page)
        try:
            page = int(request.query_params.get("page", 1))
        except ValueError:
            page = 1
        try:
            per_page = int(request.query_params.get("per_page", 12))
        except ValueError:
            per_page = 12
        per_page = max(1, min(per_page, 200))  # OpenAlex max ~200

        # 4) Optional year filter
        filters = []
        if year_min is not None and year_max is not None:
            filters.append(f"publication_year:{year_min}-{year_max}")
        elif year_min is not None:
            filters.append(f"publication_year:>{year_min-1}")
        elif year_max is not None:
            filters.append(f"publication_year:<{year_max+1}")
        filter_param = ",".join(filters) if filters else None

        # 5) OpenAlex request
        params = {
            "search": search_string,
            "page": page,
            "per_page": per_page,
            "sort": "relevance_score:desc",   # ensure relevance_score is present & ranked
            "mailto": "ceydasen40@gmail.com",
        }
        if filter_param:
            params["filter"] = filter_param

        try:
            resp = requests.get(OPENALEX_BASE, params=params, timeout=15)
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Upstream error contacting OpenAlex: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if resp.status_code != 200:
            return Response(
                {"detail": "OpenAlex error", "status": resp.status_code, "body": resp.text},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payload = resp.json()
        results = payload.get("results", []) or []
        meta = payload.get("meta", {}) or {}

        # 6) Map OpenAlex work → frontend item
        def reconstruct_abstract(inv):
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

        def to_item(w):
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

            # Prefer OA URL if present
            url = (
                best_oa_location.get("url")
                or primary_source.get("url")
                or host_venue.get("url")
                or w.get("openalex")
                or ""
            )

            # Abstract normalization
            abstract_field = w.get("abstract")
            if not abstract_field:
                inv = w.get("abstract_inverted_index")
                abstract_field = reconstruct_abstract(inv) if inv else ""

            # Concepts (cap to 10)
            concepts = []
            for c in (w.get("concepts") or [])[:10]:
                name = (c or {}).get("display_name")
                if name:
                    concepts.append(name)

            # Metrics / badges
            cited_by_count   = w.get("cited_by_count", 0)
            references_count = len(w.get("referenced_works") or [])
            rel              = w.get("relevance_score")
            relevance_pct    = round(rel * 100) if isinstance(rel, (int, float)) else None
            is_oa            = bool(open_access.get("is_oa"))
            oa_status        = open_access.get("oa_status") or ""
            oa_url           = best_oa_location.get("url") or ""

            return {
                "id": w.get("id") or "",
                "title": w.get("display_name") or "",
                "abstract": abstract_field,
                "url": url,
                "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
                "venue": host_venue.get("display_name") or "",
                "year": w.get("publication_year"),
                "authors": authors,
                "authors_text": ", ".join(authors[:6]),
                "concepts": concepts,
                "tags": [],  # UI compatibility
                "relevance_pct": relevance_pct,
                "cited_by_count": cited_by_count,
                "references_count": references_count,
                "is_open_access": is_oa,
                "oa_status": oa_status,
                "oa_url": oa_url,
                # legacy alias for your UI if it reads "score"
                "score": cited_by_count,
                "created_at": None,
            }

        items = []
        for w in results:
            try:
                items.append(to_item(w))
            except Exception:
                # skip malformed item safely
                continue

        # 7) Pagination wrapper
        total = meta.get("count", 0)
        current_page = meta.get("page", page)
        per = meta.get("per_page", per_page)

        next_url = None
        prev_url = None
        if (current_page * per) < total:
            next_q = {"page": current_page + 1, "per_page": per}
            next_url = f"?{urllib.parse.urlencode(next_q)}"
        if current_page > 1:
            prev_q = {"page": current_page - 1, "per_page": per}
            prev_url = f"?{urllib.parse.urlencode(prev_q)}"

        ser = PaperResponseSerializer(items, many=True)
        return Response({
            "count": total,
            "next": next_url,
            "previous": prev_url,
            "results": ser.data,
            "query_summary": {
                "abstracts_count": len([a for a in abstracts if a.strip()]),
                "keywords_count": len([k for k in keywords if k.strip()]),
                "page": current_page,
                "per_page": per,
            }
        })
