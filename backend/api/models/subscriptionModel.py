# subscriptions/models.py
from django.db import models
from django.utils.crypto import get_random_string
from .subscriberModel import Subscriber

class Subscription(models.Model):
    subscriber = models.ForeignKey(
        Subscriber,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        null=True,
        blank=True,
    )
    email = models.EmailField()
    query_name = models.CharField(max_length=255)

    # store the current query that the user subscribed to
    abstracts = models.JSONField(default=list, blank=True)
    keywords = models.JSONField(default=list, blank=True)

    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, unique=True)

    consent_given_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Mailing için
    frequency = models.CharField(
        max_length=16,
        default="weekly",           # şimdilik sabit tutabilirsin
        choices=[("weekly", "Weekly")],
    )
    last_sent_at = models.DateTimeField(null=True, blank=True)

    def set_new_token(self):
        self.verification_token = get_random_string(48)

    def __str__(self):
        return f"{self.email} – {self.query_name}"
