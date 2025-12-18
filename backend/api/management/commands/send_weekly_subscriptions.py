from django.core.management.base import BaseCommand
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from datetime import timedelta
from api.models.subscriptionModel import Subscription
from app.openalex_client import work_to_text_fields
from app.services.openalex_multi_abstract import rerank_openalex_for_abstracts
import math
import re
from django.conf import settings
from django.db.models import Q
from api.models.subscriberModel import Subscriber
from django.core import signing
from urllib.parse import urlparse


def _sanitize_header_value(s):
    """Remove CR/LF and control characters that may break email headers.
    Replace runs of whitespace/newlines with a single space and strip.
    """
    if s is None:
        return ""
    # Ensure string
    try:
        val = str(s)
    except Exception:
        val = ""
    # Remove carriage returns/newlines and other C0 control chars
    # keep printable whitespace as single spaces
    val = re.sub(r"[\r\n\t]+", " ", val)
    # strip remaining control chars (except normal printable range)
    val = re.sub(r"[\x00-\x1f\x7f]+", "", val)
    return val.strip()


def score_work_against_subscription(work_text, subscription):
    """Very small heuristic score: count keyword/abstract token overlaps."""
    score = 0
    text = (work_text or "").lower()
    # keywords: subscription.keywords is probably a JSON list
    kws = []
    try:
        kws = subscription.keywords or []
    except Exception:
        kws = []
    for kw in kws:
        if not kw:
            continue
        if kw.lower() in text:
            score += 3
    # abstracts list
    abs_terms = []
    try:
        abs_terms = subscription.abstracts or []
    except Exception:
        abs_terms = []
    for a in abs_terms:
        if not a:
            continue
        if a.lower() in text:
            score += 2
    # small bonus for presence of query_name
    if subscription.query_name and subscription.query_name.lower() in text:
        score += 1
    return score


class Command(BaseCommand):
    help = 'Send weekly subscription emails for verified and active subscriptions.'

    def handle(self, *args, **options):
        now = timezone.now()
        week_ago = now - timedelta(days=7)

        # select subscriptions that are weekly, verified, active, and haven't been sent in the last 7 days
        subs = Subscription.objects.filter(is_verified=True, is_active=True, frequency='weekly')
        subs = subs.filter(Q(last_sent_at__lt=week_ago) | Q(last_sent_at__isnull=True))

        sent_count = 0
        for sub in subs:
            # Always use the last 7 days window (from now - 7 days to now)
            from_dt = now - timedelta(days=365)
            from_iso = from_dt.date().isoformat()
            to_iso = now.date().isoformat()

            # build user keywords raw string from subscription.keywords
            kw_list = []
            if getattr(sub, 'keywords', None):
                try:
                    if isinstance(sub.keywords, (list, tuple)):
                        kw_list = [str(k).strip() for k in sub.keywords if str(k).strip()]
                    else:
                        kw_list = [t.strip() for t in re.split(r"[;,]", str(sub.keywords)) if t.strip()]
                except Exception:
                    kw_list = []
            user_keywords_raw = ";".join(kw_list)

            abstracts_list = []
            if getattr(sub, 'abstracts', None):
                try:
                    if isinstance(sub.abstracts, (list, tuple)):
                        abstracts_list = [a for a in sub.abstracts if a]
                    else:
                        # if stored as a single string, treat as one abstract
                        abstracts_list = [str(sub.abstracts)]
                except Exception:
                    abstracts_list = []

            # Prepare truncated subscription abstracts and keywords for the email
            def truncate_text(t, n=300):
                if not t:
                    return ""
                t = str(t).strip()
                if len(t) <= n:
                    return t
                # try to cut at last sentence break before n if possible
                cut = t[:n]
                last_period = max(cut.rfind('. '), cut.rfind('? '), cut.rfind('! '))
                if last_period > int(n * 0.4):
                    cut = cut[: last_period + 1]
                return cut.rstrip() + '…'

            # use the same truncation length as the helper default (300) so previews are longer and consistent
            subscription_abstracts = [truncate_text(a, 300) for a in abstracts_list]

            subscription_keywords = []
            if getattr(sub, 'keywords', None):
                try:
                    if isinstance(sub.keywords, (list, tuple)):
                        subscription_keywords = [str(k).strip() for k in sub.keywords if str(k).strip()]
                    else:
                        subscription_keywords = [t.strip() for t in re.split(r"[;,]", str(sub.keywords)) if t.strip()]
                except Exception:
                    subscription_keywords = []

            try:
                scored = rerank_openalex_for_abstracts(
                    abstracts=abstracts_list,
                    user_keywords_raw=user_keywords_raw,
                    per_group=30,
                    top_k=200,
                    from_publication_date=from_iso,
                    to_publication_date=to_iso,
                )
            except Exception as e:
                self.stderr.write(f"Error running rerank pipeline for sub {sub.id}: {e}")
                scored = []

            # take top positives
            chosen = [e for e in scored if e.get('total_score', 0) > 0][:5]

            items = []
            max_score = chosen[0]['total_score'] if chosen else 1.0
            for entry in chosen:
                w = entry['work']
                wid, title, abstract_text, topics_text, concepts_text = work_to_text_fields(w)
                short_id = (w.get('id') or '').rsplit('/', 1)[-1]
                oa_url = f"https://openalex.org/{short_id}" if short_id else ''
                year = w.get('publication_year') or w.get('year') or ''
                venue = (w.get('host_venue') or {}).get('display_name') or ''
                authors = ', '.join([a.get('author', {}).get('display_name') for a in w.get('authorships', []) if a.get('author')])[:200]
                # Compute percentage the same way the frontend Search page does:
                # avg of per_abstract_sims * 100
                sims = entry.get('per_abstract_sims') or []
                if sims:
                    avg_sim = sum(sims) / len(sims)
                    score_percent = round(avg_sim * 100, 2)
                else:
                    score_percent = 0
                # extract OA and counts
                open_access = w.get('open_access') or {}
                is_oa = bool(open_access.get('is_oa'))
                best_oa = (w.get('best_oa_location') or {})
                oa_link = best_oa.get('url') or ''
                cited_by = w.get('cited_by_count') or 0
                references_count = len(w.get('referenced_works') or [])

                items.append({
                    'title': title or '',
                    'abstract': abstract_text or '',
                    'openalex_url': oa_url,
                    'year': year,
                    'venue': venue,
                    'authors': authors,
                    'score_percent': score_percent,
                    'is_open_access': is_oa,
                    'oa_url': oa_link,
                    'cited_by_count': cited_by,
                    'references_count': references_count,
                })

            # render template and send email if we have any items
            if items:
                # Ensure we have a Subscriber object to obtain a manage_token.
                # Some older subscriptions may not have the `subscriber` FK set.
                subscriber = getattr(sub, "subscriber", None)
                if subscriber is None:
                    # Try to find by email first
                    subscriber = Subscriber.objects.filter(email=sub.email).first()
                    if subscriber is None:
                        # Create a minimal subscriber so we can produce a manage link.
                        subscriber = Subscriber.objects.create(email=sub.email)
                    # Link the subscription to the subscriber for future runs
                    sub.subscriber = subscriber
                    try:
                        sub.save(update_fields=["subscriber"])
                    except Exception:
                        # non-fatal: continue even if save fails
                        pass

                manage_url = f"{settings.SUBSCRIPTION_FRONTEND_MANAGE_URL}?token={subscriber.manage_token}"
                # Add signed goodmatch links per item (single-click recording)
                # Use explicit backend base URL (avoid pointing links to frontend dev server)
                base_site = getattr(settings, 'SUBSCRIPTION_BACKEND_BASE_URL', '') or getattr(settings, 'SITE_URL', '')

                for it in items:
                    payload = {
                        'subscriber_token': subscriber.manage_token,
                        'work_id': it.get('openalex_url', '').rsplit('/', 1)[-1],
                        'title': it.get('title', ''),
                        'openalex_url': it.get('openalex_url', ''),
                        'subscription_id': sub.id,
                        'score_percent': it.get('score_percent', 0),
                    }
                    signed = signing.dumps(payload, salt='goodmatch-v1')
                    site_root = (base_site or '').rstrip('/')
                    it['goodmatch_link'] = f"{site_root}/api/goodmatch/record/?gm={signed}"

                safe_search_name = _sanitize_header_value(sub.query_name or 'Your search')

                context = {
                    'search_name': safe_search_name,
                    'new_items': items,
                    'manage_url': manage_url,
                    'subscription_keywords': subscription_keywords,
                    'subscription_abstracts': subscription_abstracts,
                }
                html = render_to_string('subscriptions/weekly_update_email.html', context)
                # sanitize subject to avoid header injection / invalid header chars
                subject = f"[Proxima] — Weekly update for {safe_search_name}"
                from_email = settings.DEFAULT_FROM_EMAIL
                to = [sub.email]
                msg = EmailMultiAlternatives(subject=subject, body=html, from_email=from_email, to=to)
                msg.attach_alternative(html, "text/html")
                try:
                    msg.send()
                    sub.last_sent_at = now
                    sub.save()
                    sent_count += 1
                    self.stdout.write(self.style.SUCCESS(f"Sent to {sub.email} ({len(items)} items)"))
                except Exception as e:
                    self.stderr.write(f"Failed to send to {sub.email}: {e}")
            else:
                self.stdout.write(f"No items for {sub.email}")

        self.stdout.write(self.style.SUCCESS(f"Done. Emails sent: {sent_count}"))
