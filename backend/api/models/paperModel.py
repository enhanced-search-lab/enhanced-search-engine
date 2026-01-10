from django.db import models
from django.utils import timezone

# apps/search/models.py
from django.db import models
from django.utils import timezone

class Paper(models.Model):
    openalex_id = models.CharField(max_length=64, unique=True, db_index=True)  # e.g. "https://openalex.org/W2194775991"
    title       = models.TextField()
    abstract    = models.TextField(blank=True, default="")
    doi         = models.CharField(max_length=255, blank=True, default="")
    url         = models.URLField(blank=True, default="")
    venue       = models.CharField(max_length=255, blank=True, default="")
    year        = models.IntegerField(null=True, blank=True)

    # denormalized for quick display
    authors_text = models.TextField(blank=True, default="")         # "A. Smith, B. Lee"
    authors_json = models.JSONField(blank=True, default=list)
    concepts     = models.JSONField(blank=True, default=list)

    cited_by_count   = models.IntegerField(default=0)
    references_count = models.IntegerField(default=0)

    is_open_access   = models.BooleanField(default=False)
    oa_status        = models.CharField(max_length=32, blank=True, default="")   # gold/green/closed/bronze
    oa_url           = models.URLField(blank=True, default="")

    relevance_score  = models.FloatField(null=True, blank=True)  # from OpenAlex when using "search"

    fetched_at = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = "api"
        ordering = ["-cited_by_count"]

    def __str__(self):
        return f"{self.title[:80]}…"

