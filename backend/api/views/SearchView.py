from django.db.models import Q, Case, When, IntegerField
# Q lets us build complex queries with AND/OR logic
# Case and When allow us to create conditional expressions for annotating querysets
# IntegerField is used to define the type of the annotation field
from rest_framework.views import APIView
# APIView is the DRF base for a class-based endpoint where you define get/post/...
from rest_framework.response import Response
# Response returns proper JSON responses.
from rest_framework.pagination import PageNumberPagination
from rest_framework import status, permissions

# from ..models import Paper
from ..serializers.SearchRequestSerializer import SearchRequestSerializer
from ..serializers.PaperSerializer import PaperSerializer
from drf_spectacular.utils import extend_schema


import requests
import urllib.parse

# Base URL for OpenAlex "works" API
OPENALEX_BASE = "https://api.openalex.org/works"


@extend_schema(
    request=SearchRequestSerializer,
    responses=PaperSerializer(many=True),  # paginated wrapper in UI, items are Paper
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
      - Return a DRF-like paginated object: { count, next, previous, results }
    """

    # IMPORTANT: disable SessionAuthentication here so POSTs don't need CSRF
    authentication_classes = []            # no auth → no CSRF
    # anyone can access this endpoint
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # 1) Validate request body
        s = SearchRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        # 2) Extract abstracts, keywords, year_min, year_max
        abstracts = s.validated_data.get('abstracts', []) or []
        keywords = s.validated_data.get('keywords', []) or []
        year_min = s.validated_data.get('year_min')
        year_max = s.validated_data.get('year_max')

        if not abstracts and not keywords:
            return Response(
                {"detail": "At least one of 'abstracts' or 'keywords' must be provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # build a single OpenAlex search string
        # We OR all inputs together so OpenAlex can match any token across title/abstract/fulltext.
        # (Boolean operators are allowed; simple space-joined works well for mixed text.).
        # https://docs.openalex.org/api-entities/works/search-works

        tokens =[]
        tokens.extend(abstracts)
        tokens.extend(keywords)
        search_string = ' '.join(t.strip() for t in tokens if t.strip())

     # 3) Read pagination from query string (?page, ?per_page) to pass through to OpenAlex.
        try:
            page = int(request.query_params.get("page", 1))
        except ValueError:
            page = 1

        try:
            per_page = int(request.query_params.get("per_page", 12))
        except ValueError:
            per_page = 12

        # Clamp per_page to OpenAlex's maximum (docs say up to 200).
        per_page = max(1, min(per_page, 200))


     # 4) Build optional OpenAlex filter for publication year.
        # OpenAlex supports ranges: publication_year:YYYY-YYYY, or > / < / >= / <= via syntax.
        filters = []
        if year_min is not None and year_max is not None:
            # Inclusive range year_min-year_max
            filters.append(f"publication_year:{year_min}-{year_max}")
        elif year_min is not None:
            # >= year_min (OpenAlex doesn't have >= directly; we emulate with > (year_min-1))
            filters.append(f"publication_year:>{year_min-1}")
        elif year_max is not None:
            # <= year_max (emulate with < (year_max+1))
            filters.append(f"publication_year:<{year_max+1}")

        # Join multiple filter clauses with commas (AND semantics in OpenAlex).
        filter_param = ",".join(filters) if filters else None

        # 5) Call OpenAlex /works endpoint with search and filters.
        params = {
            "search": search_string,
            "page": page,
            "per_page": per_page,
            "mailto": "ceydasen40@gmail.com"
        }

        # If we constructed a filter, include it.
        if filter_param:
            params["filter"] = filter_param

        try:
            # Perform the HTTP GET with a short timeout to avoid hanging the request.
            resp = requests.get(OPENALEX_BASE, params=params, timeout=15)
        except requests.RequestException as exc:
            # Any network/timeout error becomes a 502 (bad gateway to upstream).
            return Response(
                {"detail": f"Upstream error contacting OpenAlex: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        # If OpenAlex didn't return 200, propagate a 502 with their response details.
        if resp.status_code != 200:
            return Response(
                {"detail": "OpenAlex error", "status": resp.status_code, "body": resp.text},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        
        payload = resp.json()
        # results is a list of papers
        results = payload.get("results", [])
        # meta includes count, page, and per page
        meta = payload.get("meta", {})

         # 6) Convert each OpenAlex work to the frontend's "Paper" shape.
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
            # Always use dicts/lists, never None
            host_venue        = w.get("host_venue") or {}
            primary_location  = w.get("primary_location") or {}
            primary_source    = primary_location.get("source") or {}
            authorships       = w.get("authorships") or []

            # Authors: list of display names
            authors = []
            for a in authorships:
                a_author = a.get("author") or {}
                name = a_author.get("display_name") or ""
                if name:
                    authors.append(name)

            # Choose a usable URL in priority order
            url = (
                primary_source.get("url")
                or host_venue.get("url")
                or w.get("openalex")
                or ""
            )

            # Abstract: prefer plain, else reconstruct from inverted index
            abstract_field = w.get("abstract")
            if not abstract_field:
                inv = w.get("abstract_inverted_index")
                abstract_field = reconstruct_abstract(inv) if inv else ""

            return {
                "id": w.get("id") or "",
                "title": w.get("display_name") or "",
                "abstract": abstract_field,
                "url": url,
                "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
                "venue": host_venue.get("display_name") or "",
                "year": w.get("publication_year"),
                "authors": authors,
                "tags": [],  # keep for UI compatibility
                "score": w.get("cited_by_count", 0),
                "created_at": None,
            }

        # Map all results through our adapter.
        items = []
        for w in results:
            try:
                items.append(to_item(w))
            except Exception:
                # optionally log here; for now, skip malformed item
                continue

         # 7) Return a DRF-like paginated object so your UI doesn’t need special handling.
        total = meta.get("count", 0)               # total result count across all pages
        current_page = meta.get("page", page)      # current page number
        per = meta.get("per_page", per_page)       # page size used by OpenAlex
    
        # Build relative "next" and "previous" links for convenience (your frontend can use them or ignore).
        next_url = None
        prev_url = None

        # If there are more items beyond the current page, expose a next link (?page=N+1).
        if (current_page * per) < total:
            next_q = {"page": current_page + 1, "per_page": per}
            next_url = f"?{urllib.parse.urlencode(next_q)}"

        # If we’re not on the first page, expose a previous link (?page=N-1).
        if current_page > 1:
            prev_q = {"page": current_page - 1, "per_page": per}
            prev_url = f"?{urllib.parse.urlencode(prev_q)}"

        # Final response: { count, next, previous, results }
        return Response({
            "count": total,
            "next": next_url,
            "previous": prev_url,
            "results": items
        })

