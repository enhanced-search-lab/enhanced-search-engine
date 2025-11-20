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
