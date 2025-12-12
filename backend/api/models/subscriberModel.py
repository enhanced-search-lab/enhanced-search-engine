# app: subscriptions/models.py

import uuid
from django.db import models
from django.utils import timezone


class Subscriber(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True)

    # İstersen global email doğrulama için de kullanabilirsin,
    # şimdilik kalsın:
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(
        max_length=64,
        unique=True,
        default=uuid.uuid4,
        editable=False,
    )

    # 🆕 manage panel için gizli token
    manage_token = models.CharField(
        max_length=64,
        unique=True,
        default=uuid.uuid4,
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.email