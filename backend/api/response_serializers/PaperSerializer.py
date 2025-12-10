# apps/search/serializers/papers.py
from rest_framework import serializers

class PaperResponseSerializer(serializers.Serializer):
    """
    Pure response shape for the frontend (NOT tied to the DB).
    One item corresponds to a single OpenAlex work adapted for UI.
    """
    id = serializers.CharField()                          # "https://openalex.org/W2194..."
    title = serializers.CharField(allow_blank=True)
    abstract = serializers.CharField(required=False, allow_blank=True)  # plain text
    url = serializers.CharField(allow_blank=True, required=False)
    doi = serializers.CharField(allow_blank=True, required=False)
    venue = serializers.CharField(allow_blank=True, required=False)
    year = serializers.IntegerField(required=False, allow_null=True)
    authors = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False
    )
    authors_text = serializers.CharField(required=False, allow_blank=True)
    concepts = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False
    )
    # kept for UI compat (you can drop later)
    tags = serializers.ListField(child=serializers.CharField(), required=False)

    # Badges / metrics for the card UI
    total_score = serializers.FloatField(required=False, allow_null=True)  # Toplam benzerlik skoru
    per_abstract_sims = serializers.ListField(
        child=serializers.FloatField(), required=False
    )
    per_abstract_contribs = serializers.ListField(
        child=serializers.FloatField(), required=False
    )
    cited_by_count = serializers.IntegerField(required=False)
    references_count = serializers.IntegerField(required=False)
    is_open_access = serializers.BooleanField(required=False)
    oa_status = serializers.CharField(required=False, allow_blank=True)
    oa_url = serializers.CharField(required=False, allow_blank=True)

    # Legacy name you were using as “score”; keep if frontend reads it
    score = serializers.IntegerField(required=False)  # alias for cited_by_count
    created_at = serializers.DateTimeField(required=False, allow_null=True)
