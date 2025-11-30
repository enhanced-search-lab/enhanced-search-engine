# subscriptions/views.py
from django.utils import timezone
from django.http import HttpResponseRedirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from django.conf import settings

from ..models.subscriptionModel import Subscription
from ..model_serializers.SubscriptionCreateSerializer import SubscriptionCreateSerializer
from ..emails import send_verification_email


class SubscriptionCreateView(APIView):
    print("this part is hit")
    def post(self, request, *args, **kwargs):
        serializer = SubscriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        query_name = serializer.validated_data["query_name"]
        abstracts = serializer.validated_data.get("abstracts", [])
        keywords = serializer.validated_data.get("keywords", [])

        # ... create/get Subscription, send email, return JSON ...
        # For example:
        sub, created = Subscription.objects.get_or_create(
            email=email,
            query_name=query_name,
            abstracts=abstracts,
            keywords=keywords,
        )
        if not sub.is_verified:
            sub.consent_given_at = timezone.now()
            sub.is_active = True
            sub.set_new_token()
            sub.save()
            send_verification_email(request, sub)
            return Response(
                {"status": "pending_verification", "subscription_id": sub.id},
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        return Response(
            {"status": "already_verified", "subscription_id": sub.id},
            status=status.HTTP_200_OK,
        )
class SubscriptionVerifyView(APIView):
    authentication_classes = []
    permission_classes = []  # public endpoint

    def get(self, request, token, *args, **kwargs):
        frontend_url = getattr(
            settings,
            "SUBSCRIPTION_FRONTEND_VERIFY_URL",
            "http://localhost:5174/subscription/verified",
        )

        try:
            sub = Subscription.objects.get(verification_token=token)
        except Subscription.DoesNotExist:
            # invalid token -> redirect with error
            return HttpResponseRedirect(f"{frontend_url}?status=error")

        if not sub.is_verified:
            sub.is_verified = True
            sub.save(update_fields=["is_verified"])

        return HttpResponseRedirect(f"{frontend_url}?status=success")