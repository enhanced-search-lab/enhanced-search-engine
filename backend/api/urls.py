# URL machinery + DRF router for viewsets
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import your viewsets and the SearchView
# from .views.PaperViewSet import PaperViewSet
# from .views.TagViewSet import TagViewSet
from .views.SearchView import PaperSearchView as SearchView
from .views.SubscriptionsView import (
    SubscriptionCreateView,
    SubscriptionVerifyView,
    SubscriptionDetailView,
    SubscriberSubscriptionsView,
    SubscriptionUnsubscribeView,
    SubscriptionToggleActiveView,
    SubscriptionDeleteView,
)
from .views.OpenAlexKeywordSearchView import OpenAlexKeywordSearchView
from .views.OpenAlexGeminiKeywordSearchView import OpenAlexGeminiKeywordSearchView
from .views.EvalFeedbackView import EvalFeedbackView
from .views.GoodMatchView import record_goodmatch, list_goodmatches, delete_goodmatch

# Build RESTful routes (list/detail) for built-in resources
router = DefaultRouter()
# router.register("papers", PaperViewSet, basename="papers")
# router.register("tags", TagViewSet, basename="tags")

# Expose /api/search/ (POST) alongside /api/papers/ and /api/tags/
urlpatterns = [
    path("", include(router.urls)),
    path("search/", SearchView.as_view()),
    path("openalex-keyword-search/", OpenAlexKeywordSearchView.as_view()),
    path("openalex-gemini-keyword-search/", OpenAlexGeminiKeywordSearchView.as_view()),
    path("eval-feedback/", EvalFeedbackView.as_view()),
    path(
        "subscribe-search/",
        SubscriptionCreateView.as_view(),
        name="subscribe-search",
    ),
    path(
        "subscribe-search/verify/<str:token>/",
        SubscriptionVerifyView.as_view(),
        name="subscription-verify",
    ),
    path("subscriptions/<int:pk>/", SubscriptionDetailView.as_view(), name="subscription-detail"),

    path(
        "subscriber/subscriptions/",
        SubscriberSubscriptionsView.as_view(),
        name="subscriber-subscriptions",
    ),
    path(
        "subscriptions/<int:pk>/unsubscribe/",
        SubscriptionUnsubscribeView.as_view(),
        name="subscription-unsubscribe",
    ),
    path(
        "subscriptions/<int:pk>/toggle-active/",
        SubscriptionToggleActiveView.as_view(),
        name="subscription-toggle-active",
    ),
    path(
        "subscriptions/<int:pk>/delete/",
        SubscriptionDeleteView.as_view(),
        name="subscription-delete",
    ),
    # GoodMatch single-click recording (used by weekly email 'Mark as good match' links)
    path("goodmatch/record/", record_goodmatch, name="goodmatch-record"),
    path("goodmatches/", list_goodmatches, name="goodmatch-list"),
    path("goodmatches/<int:pk>/delete/", delete_goodmatch, name="goodmatch-delete"),

]
