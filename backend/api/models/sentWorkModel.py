from django.db import models
from django.utils import timezone
from .subscriberModel import Subscriber
from .subscriptionModel import Subscription


class SentWork(models.Model):
    """Records a work that was sent in a weekly email.
    
    Used to:
    - Track which works have been sent to which subscriptions
    - Avoid sending the same work again in future emails
    - Populate the "Relevant from Archive" section with previous email items
    """
    subscriber = models.ForeignKey(
        Subscriber,
        on_delete=models.CASCADE,
        related_name="sent_works"
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="sent_works"
    )

    # OpenAlex work identifier (short form, e.g., "W2194775991")
    work_id = models.CharField(max_length=255, db_index=True)
    
    # When this work was sent in an email
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        # Prevent duplicate records for the same work in same subscription
        unique_together = ("subscription", "work_id")
        indexes = [
            models.Index(fields=["subscriber", "sent_at"]),
            models.Index(fields=["subscription", "sent_at"]),
            models.Index(fields=["work_id"]),
        ]
        ordering = ["-sent_at"]

    def __str__(self):
        return f"SentWork {self.work_id} to {self.subscription.email}"