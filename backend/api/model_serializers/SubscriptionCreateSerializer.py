# subscriptions/serializers.py
from rest_framework import serializers
from ..models.subscriptionModel import Subscription


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    # extra field coming from the checkbox in the modal
    agree_to_emails = serializers.BooleanField(write_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id",
            "email",
            "query_name",
            "abstracts",
            "keywords",
            "agree_to_emails",
        ]

    def validate_agree_to_emails(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must agree to receive email notifications."
            )
        return value

    def validate(self, attrs):
        """
        Prevent creating multiple subscriptions with the same email and query_name.
        This gives a friendly error before hitting a DB integrity error.
        """
        email = attrs.get("email")
        query_name = attrs.get("query_name")
        # case-insensitive comparison for query name to avoid dupes due to capitalization
        if email and query_name:
            if Subscription.objects.filter(email__iexact=email, query_name__iexact=query_name).exists():
                raise serializers.ValidationError(
                    "A subscription with this email and query name already exists."
                )
        return attrs


# 🆕 Manage page listesi için basit serializer
class SubscriptionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            "id",
            "query_name",
            "abstracts",
            "keywords",
            "is_verified",
            "is_active",
            "created_at",
        ]