# DRF's serializer primitives (fields, validators, etc.)
from rest_framework import serializers

# Define the expected shape of the JSON body for /api/search (POST).
class SearchRequestSerializer(serializers.Serializer):
    # "abstracts" is OPTIONAL, but if provided it must be a list of non-empty strings.
    abstracts = serializers.ListField(
        # Each element of the list must be a trimmed, non-blank string.
        child=serializers.CharField(allow_blank=False, trim_whitespace=True),
        # If "abstracts" is present, it can't be an empty list; at least one item.
        allow_empty=True,
        # The whole "abstracts" field is optional (client may send only "keywords").
        required=False
    )

    # "keywords" is OPTIONAL; when present it must be a list of non-empty strings.
    keywords = serializers.ListField(
        child=serializers.CharField(allow_blank=False, trim_whitespace=True),
        required=False,
        # If "keywords" is omitted, treat it as [] (not None).
        default=list,
        allow_empty=True
    )

    # Optional numeric filters for publication year bounds.
    year_min = serializers.IntegerField(required=False)
    year_max = serializers.IntegerField(required=False)

    def validate(self, data):
        """Allow either/both to be omitted; decide behavior when everything is empty."""
        abstracts = data.get("abstracts") or []
        keywords  = data.get("keywords")  or []
        year_min  = data.get("year_min")
        year_max  = data.get("year_max")

        # OPTION 1 (recommended): allow year-only queries, but block totally empty queries.
        if not abstracts and not keywords and year_min is None and year_max is None:
            raise serializers.ValidationError(
                "Provide at least one abstract, keyword, or a year filter."
            )

        # OPTION 2: if you prefer to allow totally empty queries, comment the block above.
        return data
