from django.shortcuts import redirect
from django.http import HttpResponseBadRequest, HttpResponse
from django.conf import settings
from django.core import signing
from django.utils import timezone

from api.models.subscriberModel import Subscriber
from api.models.goodmatchModel import GoodMatch
from api.models.subscriptionModel import Subscription
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.forms.models import model_to_dict


def record_goodmatch(request):
    """Record a single-click GoodMatch from an email link.

    Expects a signed `gm` GET parameter (Django signing). If valid,
    creates or updates GoodMatch for the subscriber and redirects the
    user to the OpenAlex url (if present) or homepage.
    """
    signed = request.GET.get("gm")
    if not signed:
        return HttpResponseBadRequest("Missing token")

    try:
        payload = signing.loads(signed, salt="goodmatch-v1", max_age=60 * 60 * 24 * 30)
    except signing.SignatureExpired:
        return HttpResponseBadRequest("Token expired")
    except signing.BadSignature:
        return HttpResponseBadRequest("Invalid token")

    subscriber_token = payload.get("subscriber_token")
    work_id = payload.get("work_id")
    title = payload.get("title", "")
    openalex_url = payload.get("openalex_url", "")
    subscription_id = payload.get("subscription_id")
    score_percent = payload.get("score_percent")

    if not subscriber_token or not work_id:
        return HttpResponseBadRequest("Invalid payload")

    subscriber = Subscriber.objects.filter(manage_token=subscriber_token).first()
    if not subscriber:
        return HttpResponseBadRequest("Subscriber not found")

    # Resolve subscription object if provided
    subscription_obj = None
    try:
        if subscription_id:
            subscription_obj = Subscription.objects.filter(pk=subscription_id).first()
    except Exception:
        subscription_obj = None

    # Try to find an existing GoodMatch for this (subscriber, subscription, work).
    # This allows the same work to be saved separately under different subscriptions.
    gm = GoodMatch.objects.filter(subscriber=subscriber, subscription=subscription_obj, work_id=work_id).first()
    if gm:
        # Update last_clicked_at (don't track click_count per request)
        gm.last_clicked_at = timezone.now()
        # update score if provided
        try:
            if score_percent is not None:
                gm.score = float(score_percent)
        except Exception:
            pass
        try:
            gm.save(update_fields=["last_clicked_at", "score"])
        except Exception:
            gm.save()
    else:
        # Create a new GoodMatch tied to this subscription (may be None)
        try:
            gm = GoodMatch.objects.create(
                subscriber=subscriber,
                subscription=subscription_obj,
                work_id=work_id,
                title=title,
                openalex_url=openalex_url,
                score=score_percent,
            )
        except Exception:
            # If create fails (e.g., unique constraint from old schema),
            # Fall back to updating/creating by subscriber+work_id to preserve behavior.
            gm, created = GoodMatch.objects.get_or_create(
                subscriber=subscriber,
                work_id=work_id,
                defaults={
                    "title": title,
                    "openalex_url": openalex_url,
                },
            )
            if not created:
                gm.last_clicked_at = timezone.now()
                gm.save(update_fields=["last_clicked_at"]) 

    # Redirect to OpenAlex if possible, else to site root
    return redirect(openalex_url or getattr(settings, "SITE_URL", "/"))


@require_http_methods(["GET"])
def list_goodmatches(request):
    """List GoodMatch entries for a subscriber identified by manage token.

    Query param: token=<manage_token>
    Returns JSON list of matches.
    """
    token = request.GET.get("token")
    if not token:
        return JsonResponse({"error": "Missing token"}, status=400)
    subscriber = Subscriber.objects.filter(manage_token=token).first()
    if not subscriber:
        return JsonResponse({"error": "Subscriber not found"}, status=404)

    q = GoodMatch.objects.filter(subscriber=subscriber).order_by("-last_clicked_at")
    items = []
    for gm in q:
        items.append({
            "id": gm.id,
            "work_id": gm.work_id,
            "title": gm.title,
            "openalex_url": gm.openalex_url,
            "score": gm.score,
            "first_clicked_at": gm.first_clicked_at.isoformat() if gm.first_clicked_at else None,
            "last_clicked_at": gm.last_clicked_at.isoformat() if gm.last_clicked_at else None,
            "subscription_id": gm.subscription.id if gm.subscription else None,
        })

    return JsonResponse({"good_matches": items})


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_goodmatch(request, pk):
    """Delete a GoodMatch for a subscriber. Expects token query param to authorize."""
    token = request.GET.get("token")
    if not token:
        return JsonResponse({"error": "Missing token"}, status=400)
    subscriber = Subscriber.objects.filter(manage_token=token).first()
    if not subscriber:
        return JsonResponse({"error": "Subscriber not found"}, status=404)

    gm = GoodMatch.objects.filter(id=pk, subscriber=subscriber).first()
    if not gm:
        return JsonResponse({"error": "Not found"}, status=404)
    gm.delete()
    return JsonResponse({"ok": True})
