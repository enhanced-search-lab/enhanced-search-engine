# subscriptions/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import permissions
from ..models import Subscriber
from ..model_serializers import SubscriptionCreateSerializer, SubscriptionDetailSerializer

class SubscriberSubscriptionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"detail": "token required"}, status=400)

        try:
            subscriber = Subscriber.objects.get(manage_token=token)
        except Subscriber.DoesNotExist:
            return Response({"detail": "invalid token"}, status=404)

        subs = subscriber.subscriptions.all().order_by("-created_at")
        ser = SubscriptionDetailSerializer(subs, many=True)
        return Response({
            "email": subscriber.email,
            "subscriptions": ser.data,
        })
