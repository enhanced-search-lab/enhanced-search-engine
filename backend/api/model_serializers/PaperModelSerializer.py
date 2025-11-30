# apps/search/serializers/paper_model.py
from rest_framework import serializers
from ..models import Paper

class PaperModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paper
        fields = [
            "openalex_id","title","abstract","url","doi","venue","year",
            "authors_text","authors_json","concepts",
            "cited_by_count","references_count",
            "is_open_access","oa_status","oa_url",
            "relevance_score","fetched_at",
        ]
