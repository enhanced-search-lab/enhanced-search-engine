# api/views/SubscriptionsView.py (veya mail helper'ında)
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse
from django.template.loader import render_to_string


def send_verification_email(request, subscription):
    verify_path = reverse(
        "subscription-verify",
        kwargs={"token": subscription.verification_token},
    )
    verify_url = request.build_absolute_uri(verify_path)

    manage_base = getattr(
        settings,
        "SUBSCRIPTION_FRONTEND_MANAGE_URL",
        "http://localhost:5174/subscriptions/manage",
    )
    manage_url = f"{manage_base}?token={subscription.subscriber.manage_token}"

    subject = "[Proxima] Confirm your subscription"

    # --- Plain text fallback (eski tip mail client'lar için) ---
    text_message = f"""Hi,

You requested to subscribe to the search:

    {subscription.query_name}

To start receiving suggestions, please confirm your email address:
{verify_url}

Later, you can view or cancel all your subscriptions here:
{manage_url}

If you didn't request this, you can safely ignore this email.
"""

    # --- HTML şablonu (template) render ---
    html_message = render_to_string(
        "subscriptions/confirm_subscription_email.html",
        {
            "search_name": subscription.query_name,
            "verify_url": verify_url,
            "manage_url": manage_url,
        },
    )

    from_email = getattr(
        settings,
        "DEFAULT_FROM_EMAIL",
        "Proxima Search <no-reply@example.com>",
    )

    msg = EmailMultiAlternatives(
        subject,
        text_message,
        from_email,
        [subscription.email],
    )
    msg.attach_alternative(html_message, "text/html")
    msg.send()
