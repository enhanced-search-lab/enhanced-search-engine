# subscriptions/views.py
from django.utils import timezone
from django.http import HttpResponseRedirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..models.subscriberModel import Subscriber
from django.conf import settings

from ..models.subscriptionModel import Subscription
from ..models.subscriberModel import Subscriber
from ..model_serializers.SubscriptionCreateSerializer import SubscriptionCreateSerializer
from ..model_serializers.SubscriptionCreateSerializer import SubscriptionListSerializer
from .. model_serializers.SubscriptionDetailSerializer import SubscriptionDetailSerializer  
from ..emails import send_verification_email


class SubscriptionCreateView(APIView):
    print("this part is hit")
    def post(self, request, *args, **kwargs):
        print("RAW DATA:", request.data) 

        serializer = SubscriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        print("VALIDATED DATA:", serializer.validated_data)

        email = data["email"]
        query_name = data["query_name"]
        abstracts = data.get("abstracts", [])
        keywords = data.get("keywords", [])
        
         # 1) Subscriber bul / oluştur
        subscriber, _ = Subscriber.objects.get_or_create(email=email)
        
        # ... create/get Subscription, send email, return JSON ...
        # For example:
        sub, created = Subscription.objects.get_or_create(
            email=email,
            query_name=query_name,
            abstracts=abstracts,
            keywords=keywords,
        )

          # 🆕 Subscriber alanı boşsa doldur
        if sub.subscriber_id is None:
            sub.subscriber = subscriber

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
        
        # Zaten verify edilmişse:
        sub.save(update_fields=["subscriber"])  # subscriber set ettiysek
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

        # SubscriptionsVerifyView
        return HttpResponseRedirect(f"{frontend_url}?status=success&sub_id={sub.id}")

class SubscriptionDetailView(APIView):
    """
    GET /api/subscriptions/<id>/

    Kullanıcının kayıtlı arama parametrelerini (abstracts, keywords vs.)
    tekrar çekmek için basit bir endpoint.
    """

    authentication_classes = []
    permission_classes = []  # public, çünkü link mail üzerinden zaten

    def get(self, request, pk, *args, **kwargs):
        try:
            sub = Subscription.objects.get(pk=pk)
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "Subscription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Güvenlik: doğrulanmamış bir aboneliği geri dönmeyelim
        if not sub.is_verified:
            return Response(
                {"detail": "Subscription not verified."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = SubscriptionDetailSerializer(sub)
        return Response(ser.data, status=status.HTTP_200_OK)


class SubscriberSubscriptionsView(APIView):
    """
    GET /api/subscriber/subscriptions/?token=<manage_token>

    - token: Subscriber.manage_token
    - response: { email, subscriptions: [...] }
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        token = request.query_params.get("token")
        if not token:
            return Response(
                {"detail": "Missing token parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subscriber = Subscriber.objects.get(manage_token=token)
        except Subscriber.DoesNotExist:
            return Response(
                {"detail": "Invalid token."},
                status=status.HTTP_404_NOT_FOUND,
            )

        subs = (
            subscriber.subscriptions
            .filter(is_active=True)
            .order_by("-created_at")
        )

        ser = SubscriptionListSerializer(subs, many=True)
        return Response(
            {
                "email": subscriber.email,
                "subscriptions": ser.data,
            }
        )


class SubscriptionUnsubscribeView(APIView):
    """
    POST /api/subscriptions/<id>/unsubscribe/?token=<manage_token>

    - token: Subscriber.manage_token
    - id: Subscription PK
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request, pk, *args, **kwargs):
        token = request.query_params.get("token")
        if not token:
            return Response(
                {"detail": "Missing token parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subscriber = Subscriber.objects.get(manage_token=token)
        except Subscriber.DoesNotExist:
            return Response(
                {"detail": "Invalid token."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            sub = subscriber.subscriptions.get(pk=pk)
        except Subscription.DoesNotExist:
            return Response(
                {"detail": "Subscription not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # hard delete yerine soft delete:
        sub.is_active = False
        sub.save(update_fields=["is_active"])

        return Response(status=status.HTTP_204_NO_CONTENT)
