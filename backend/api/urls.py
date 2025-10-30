# URL machinery + DRF router for viewsets
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import your viewsets and the SearchView
# from .views.PaperViewSet import PaperViewSet
# from .views.TagViewSet import TagViewSet
from .views.SearchView import PaperSearchView as SearchView

# Build RESTful routes (list/detail) for built-in resources
router = DefaultRouter()
# router.register("papers", PaperViewSet, basename="papers")
# router.register("tags", TagViewSet, basename="tags")

# Expose /api/search/ (POST) alongside /api/papers/ and /api/tags/
urlpatterns = [
    path("", include(router.urls)),
    path("search/", SearchView.as_view()),
]
