# api/views/SubscriptionsView.py (veya mail helper'ında)
from django.conf import settings
from django.core.mail import send_mail
from django.urls import reverse


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

    subject = f"[Proxima] Confirm your subscription"

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

    # --- HTML versiyon (çoğu client bunu gösterecek) ---
    html_message = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111827; line-height:1.6;">
        <p>Hi,</p>

        <p>You requested to subscribe to the search:</p>

        <p style="margin:16px 0; padding:12px 16px; background:#f3f4ff; border-radius:12px; font-weight:600;">
          {subscription.query_name}
        </p>

        <p>To start receiving suggestions, please confirm your email address:</p>

        <p style="margin:16px 0;">
          <a href="{verify_url}"
             style="display:inline-block; padding:10px 18px; background:#4f46e5; color:#ffffff; text-decoration:none; border-radius:999px; font-weight:600;">
            Confirm subscription
          </a>
        </p>

        <p style="font-size:13px; color:#6b7280;">
          If the button doesn&apos;t work, copy and paste this URL into your browser:<br/>
          <span style="word-break:break-all; color:#4b5563;">{verify_url}</span>
        </p>

        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />

        <p style="font-size:14px;">
          Later, you can view or cancel all your subscriptions here:
        </p>
        <p style="margin:8px 0;">
          <a href="{manage_url}" style="color:#4f46e5; text-decoration:underline;">
            Manage my subscriptions
          </a>
        </p>

        <p style="font-size:12px; color:#9ca3af; margin-top:24px;">
          If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </body>
    </html>
    """

    from_email = getattr(
        settings,
        "DEFAULT_FROM_EMAIL",
        "Proxima Search <no-reply@example.com>",
    )

    send_mail(
        subject,
        text_message,
        from_email,
        [subscription.email],
        fail_silently=False,
        html_message=html_message,  # 👈 artık HTML de gidiyor
    )
