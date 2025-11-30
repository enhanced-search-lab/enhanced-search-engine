# apps/search/admin.py
from django.contrib import admin
from .models.paperModel import Paper
@admin.register(Paper)
class PaperAdmin(admin.ModelAdmin):
    list_display = ("title", "year", "venue", "cited_by_count", "is_open_access")
    search_fields = ("title", "openalex_id", "doi")


# Register your models here.
