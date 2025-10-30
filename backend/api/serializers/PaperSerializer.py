# backend/api/serializers.py
from rest_framework import serializers

class PaperSerializer(serializers.Serializer):
    """
    Shapes an OpenAlex work into the fields your frontend expects.
    Not tied to any Django model.
    """
    id = serializers.CharField()                 # e.g. "https://openalex.org/W123..."
    title = serializers.CharField(allow_blank=True)
    abstract = serializers.JSONField(required=False)  # OpenAlex may return string OR abstract_inverted_index
    url = serializers.CharField(allow_blank=True, required=False)
    doi = serializers.CharField(allow_blank=True, required=False)
    venue = serializers.CharField(allow_blank=True, required=False)
    year = serializers.IntegerField(required=False, allow_null=True)
    authors = serializers.ListField(
        child=serializers.CharField(allow_blank=True),
        required=False
    )
    tags = serializers.ListField(                # we keep this for UI compatibility (empty list)
        child=serializers.CharField(),
        required=False
    )
    score = serializers.IntegerField(required=False)  # using cited_by_count as a proxy score
    created_at = serializers.DateTimeField(required=False, allow_null=True)
