# subscriptions/emails.py
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives


def send_verification_email(request, subscription):
    current_site = get_current_site(request)
    domain = current_site.domain

    verify_url = f"{request.scheme}://{domain}/api/subscribe-search/verify/{subscription.verification_token}/"

    subject = "Confirm your paper alerts subscription"
    message = (
        "Hi,\n"
        "You asked to subscribe to weekly updates for:\n"
        f'  "{subscription.query_name}"\n\n'
        "Please confirm your email address by clicking the link below:\n"
        f"{verify_url}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )

    # ✅ use template name, not filesystem path
    html_body = render_to_string(
        "subscriptions/verification_email.html",
        {"subscription": subscription, "verify_url": verify_url},
    )

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@example.com")

    msg = EmailMultiAlternatives(subject, message, from_email, [subscription.email])
    msg.attach_alternative(html_body, "text/html")
    msg.send()
