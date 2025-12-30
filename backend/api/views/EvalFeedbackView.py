from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from drf_spectacular.utils import extend_schema

import json
from pathlib import Path


@extend_schema(
    request=dict,
    responses=dict,
    description=(
        "Collect anonymous user evaluation about which result list felt better in evaluation mode. "
        "Intended purely for offline analysis; no impact on search results."
    ),
)
class EvalFeedbackView(APIView):
    """Minimal endpoint to collect user evaluation feedback.

    POST /api/eval-feedback/
        Body JSON (from frontend): {
            "query": {"abstracts": [...], "keywords": [...]},
            "choice": "left"|"right"|"both"|"none",
            "comment": string | null,
            "left_ids": ["W...", ...],
            "right_ids": ["W...", ...]
        }

        When persisting to eval_feedback_log.json we do NOT store individual paper ids.
        Instead we only keep a compact summary of which setup was on the left/right and
        which one the user preferred.
        """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data or {}
        # Remove all validation: accept and persist any incoming feedback
        choice = data.get("choice")
        query = data.get("query") if "query" in data else None

        # Persist feedback into a local JSON file for offline analysis.
        # File will live under the backend project root as eval_feedback_log.json.
        # We deliberately do not store per-paper ids; only which setup was on each
        # side and what the user chose.
        try:
            # Frontend, her sayfa yüklemesinde üç pipeline'ı (embedding, raw_openalex,
            # gemini_openalex) rastgele olarak left/middle/right sütunlarına dağıtır ve
            # bu mapping'i "layout" alanında gönderir. Eğer gelmediyse eski sabit
            # yerleşime geri düşeriz.
            layout = data.get("layout") or {}
            left_setup = layout.get("left", "embedding")
            middle_setup = layout.get("middle", "raw_openalex")
            right_setup = layout.get("right", "gemini_openalex")

            # Sadece istenen alanları kaydet: id'ler ve ranking yok, ilk seçim choice, chosen_setup embedding, tercih sırası order
            # 'choice' ilk seçilen sütun olacak (ranking varsa ilk eleman, yoksa choice)
            ranking = data.get("ranking")
            choice = ranking[0] if isinstance(ranking, list) and ranking else (data.get("choice") or None)
            order = ranking if isinstance(ranking, list) else None
            persisted = {
                "query": query,
                "choice": choice,
                "comment": data.get("comment"),
                "layout": {
                    "left": left_setup,
                    "middle": middle_setup,
                    "right": right_setup,
                },
                "chosen_setup": "embedding",
                "order": order,
            }

            log_path = Path(__file__).resolve().parent.parent.parent / "eval_feedback_log.json"
            if log_path.exists():
                try:
                    existing = json.loads(log_path.read_text())
                    if not isinstance(existing, list):
                        existing = []
                except Exception:
                    existing = []
            else:
                existing = []

            existing.append(persisted)
            log_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2))
        except Exception:
            # Swallow any file I/O errors; feedback persistence should not break UX.
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)
