from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from drf_spectacular.utils import extend_schema

from app.services.openalex_multi_abstract import fetch_openalex_candidates
from .SearchView import PaperSearchView


@extend_schema(
    request=None,
    responses=dict,
    description=(
        "Debug endpoint: query OpenAlex directly using user-provided keywords only "
        "(no embeddings, no rerank) so results can be compared with the main search pipeline."
    ),
)
class OpenAlexKeywordSearchView(APIView):
    """Simple keyword-only OpenAlex search for comparison/debugging.

    POST /api/openalex-keyword-search/
    Body JSON: { "keywords": ["foo", "bar"], "per_page": 30 }

    Behavior:
      - Join keywords into a single query string
      - Call fetch_openalex_candidates(query)
      - Map OpenAlex works using the same to_item logic as PaperSearchView
      - Return { query, count, results }
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        keywords = request.data.get("keywords") or []
        if isinstance(keywords, str):
            # Allow comma/semicolon separated string as a convenience
            parts = [p.strip() for p in keywords.replace(";", ",").split(",") if p.strip()]
            keywords = parts

        if not isinstance(keywords, list):
            return Response(
                {"detail": "'keywords' must be a list of strings or a comma-separated string."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clean_keywords = [str(k).strip() for k in keywords if str(k).strip()]
        if not clean_keywords:
            return Response(
                {"detail": "At least one keyword must be provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            per_page = int(request.data.get("per_page", 30))
        except (TypeError, ValueError):
            per_page = 30

        # optional year bounds
        year_min = request.data.get("year_min")
        year_max = request.data.get("year_max")
        from_pub = None
        to_pub = None
        try:
            if year_min is not None:
                from_pub = f"{int(year_min)}-01-01"
        except Exception:
            from_pub = None
        try:
            if year_max is not None:
                to_pub = f"{int(year_max)}-12-31"
        except Exception:
            to_pub = None

        per_page = max(1, min(per_page, 200))

        # Build simple search string for OpenAlex
        query = " ".join(clean_keywords)

        try:
            works = fetch_openalex_candidates(query=query, per_page=per_page, from_publication_date=from_pub, to_publication_date=to_pub)
        except Exception as exc:
            return Response(
                {"detail": f"Error while querying OpenAlex with keywords: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        mapper = PaperSearchView()
        items = [mapper.to_item(w) for w in works]

        return Response(
            {
                "query": query,
                "keywords": clean_keywords,
                "count": len(items),
                "results": items,
            }
        )
