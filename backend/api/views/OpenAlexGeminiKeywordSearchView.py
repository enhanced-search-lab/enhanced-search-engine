from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from drf_spectacular.utils import extend_schema

from app.services.openalex_multi_abstract import (
    abstract_to_openalex_query_gemini,
    fetch_with_progressive_relaxation,
)
from .SearchView import PaperSearchView


@extend_schema(
    request=dict,
    responses=dict,
    description=(
        "Debug endpoint: query OpenAlex using Gemini-extracted phrases from abstracts "
        "plus user-provided keywords (no embedding re-rank scores exposed, raw list only)."
    ),
)
class OpenAlexGeminiKeywordSearchView(APIView):
    """OpenAlex search based on Gemini + user keywords for comparison.

    POST /api/openalex-gemini-keyword-search/
        Body JSON: { "abstracts": [...], "keywords": [...], "per_page": 30 }

        Behavior:
            - For each abstract, use Gemini to extract phrases (or heuristic fallback).
            - Flatten all LLM phrases across abstracts.
            - Append user-provided keywords.
            - Run a single progressive OpenAlex search with all combined tokens:
                    * First try with all tokens joined.
                    * If no results, randomly drop tokens until min_terms is reached.
            - Map OpenAlex works using the same to_item logic as PaperSearchView.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        abstracts = request.data.get("abstracts") or []
        keywords = request.data.get("keywords") or []

        if isinstance(abstracts, str):
            abstracts = [abstracts]
        if isinstance(keywords, str):
            # allow comma/semicolon separated
            keywords = [
                p.strip() for p in keywords.replace(";", ",").split(",") if p.strip()
            ]

        if not isinstance(abstracts, list) or not isinstance(keywords, list):
            return Response(
                {
                    "detail": "'abstracts' and 'keywords' must be lists or strings.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            per_page = int(request.data.get("per_page", 30))
        except (TypeError, ValueError):
            per_page = 30

        per_page = max(1, min(per_page, 200))

        # 1) LLM'den phrase'leri çıkar  !!
        all_llm_tokens = []
        try:
            for abs_text in abstracts:
                raw_query = abstract_to_openalex_query_gemini(abs_text, max_terms=3)
                phrases = [p.strip() for p in raw_query.split(";") if p.strip()]
                if not phrases:
                    phrases = raw_query.split()
                if len(phrases) > 3:
                    phrases = phrases[:3]
                all_llm_tokens.extend(phrases)

            print(f"!! [GEMINI PIPELINE] LLM tokens: {all_llm_tokens}")
        except Exception as exc:
            return Response(
                {"detail": f"Error while generating Gemini keywords: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 2) Kullanıcı keyword'lerini ekle  !!
        user_kw_tokens = [str(k).strip() for k in keywords if str(k).strip()]
        print(f"!! [GEMINI PIPELINE] User kw tokens: {user_kw_tokens}")

        # 3) LLM phrases + kullanıcı keyword'lerini birleştir ve case-insensitive tekilleştir  !!
        temp_tokens = all_llm_tokens + user_kw_tokens
        seen_keys = set()
        combined_tokens = []
        for t in temp_tokens:
            key = t.lower()
            if key in seen_keys:
                continue
            seen_keys.add(key)
            combined_tokens.append(t)

        print(f"!! [GEMINI PIPELINE] Combined tokens: {combined_tokens}")

        if not combined_tokens:
            return Response(
                {
                    "count": 0,
                    "results": [],
                    "query": {"abstracts": abstracts, "keywords": keywords},
                }
            )

        # 4) Progressive relaxation ile tek OpenAlex araması  !!
        # Optional year bounds passed to OpenAlex progressive fetch
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

        try:
            works, final_query = fetch_with_progressive_relaxation(
                tokens=combined_tokens,
                per_page=per_page,
                min_terms=1,
                from_publication_date=from_pub,
                to_publication_date=to_pub,
            )
            print(f"!! [GEMINI PIPELINE] Final query: {final_query}")
        except Exception as exc:
            return Response(
                {"detail": f"Error while querying OpenAlex with combined tokens: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        mapper = PaperSearchView()
        items = [mapper.to_item(w) for w in works]

        return Response(
            {
                "count": len(items),
                "results": items,
                "query": {
                    "abstracts": abstracts,
                    "keywords": keywords,
                    "final_query": final_query,
                    "combined_tokens": combined_tokens,
                },
            }
        )
