# backend/api/model_serializers/SubscriptionDetailSerializer.py

from rest_framework import serializers
from ..models.subscriptionModel import Subscription


class SubscriptionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        # Email ve token'ı frontende göndermiyoruz
        fields = [
            "id",
            "query_name",
            "abstracts",
            "keywords",
            "is_verified",
            "is_active",
            "created_at",
            "updated_at",
        ]
