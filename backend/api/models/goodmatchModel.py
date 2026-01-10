from django.db import models
from django.utils import timezone
from .subscriberModel import Subscriber
from .subscriptionModel import Subscription


class GoodMatch(models.Model):
    """Records a user marking a work as a 'good match' from an email.

    Unique per (subscriber, subscription, work_id) so the same work can be
    saved separately under different subscriptions for the same user. We
    record timestamps but do not keep an accumulating click counter.
    """
    subscriber = models.ForeignKey(Subscriber, on_delete=models.CASCADE, related_name="good_matches")
    subscription = models.ForeignKey(Subscription, null=True, blank=True, on_delete=models.SET_NULL)

    # canonical work identifier (OpenAlex id or short id)
    work_id = models.CharField(max_length=255, db_index=True)
    title = models.TextField(blank=True)
    openalex_url = models.URLField(blank=True)
    # similarity score (percent) taken from the weekly email rerank when user clicked
    score = models.FloatField(null=True, blank=True)
    first_clicked_at = models.DateTimeField(auto_now_add=True)
    last_clicked_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "api"
        # Make GoodMatch unique per (subscriber, subscription, work_id)
        # so the same work can be saved under different subscriptions for the same user.
        unique_together = ("subscriber", "subscription", "work_id")
        indexes = [models.Index(fields=["work_id"])]

    def __str__(self):
        return f"GoodMatch {self.work_id} by {self.subscriber.email}"
