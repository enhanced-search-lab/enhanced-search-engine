from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from api.models.subscriberModel import Subscriber
from api.models.subscriptionModel import Subscription


class PaperSearchViewTests(APITestCase):
	"""Tests for /api/search/ endpoint."""

	def test_requires_at_least_one_abstract_or_keyword(self):
		"""If both abstracts and keywords are empty, return 400 with a clear message."""
		url = "/api/search/"  # included from core.urls
		payload = {"abstracts": [], "keywords": []}

		response = self.client.post(url, data=payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		# Serializer validate() raises a ValidationError, which DRF returns as
		# a non_field_errors entry containing our message.
		self.assertIn("non_field_errors", response.data)
		self.assertIn("Provide at least one abstract, keyword, or a year filter.", response.data["non_field_errors"][0])

	@patch("api.views.SearchView.rerank_openalex_for_abstracts")
	def test_success_response_structure_with_mocked_semantic_search(self, mock_rerank):
		"""Happy-path: semantic search is mocked, we verify the response shape and key fields."""

		mock_rerank.return_value = [
			{
				"total_score": 1.23,
				"per_abstract_sims": [0.9],
				"per_abstract_contribs": [0.7],
				"work": {
					"id": "https://openalex.org/W1234567",
					"display_name": "Test Paper",
					"abstract": "A test abstract.",
					"doi": "https://doi.org/10.1234/test",
					"host_venue": {"display_name": "Test Venue"},
					"publication_year": 2024,
					"authorships": [
						{"author": {"display_name": "Author One"}},
						{"author": {"display_name": "Author Two"}},
					],
					"concepts": [
						{"display_name": "Artificial Intelligence"},
					],
					"cited_by_count": 10,
					"referenced_works": ["R1", "R2", "R3"],
					"open_access": {"is_oa": True, "oa_status": "gold"},
					"best_oa_location": {"url": "https://example.org/open-access"},
					"created_date": "2024-01-01",
				},
			}
		]

		url = "/api/search/?page=1&per_page=10"
		payload = {
			"abstracts": ["some abstract text"],
			"keywords": ["ai"],
		}

		response = self.client.post(url, data=payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)

		body = response.json()

		# Top-level pagination info
		self.assertEqual(body["count"], 1)
		self.assertEqual(body["query_summary"]["abstracts_count"], 1)
		self.assertEqual(body["query_summary"]["keywords_count"], 1)
		self.assertEqual(body["query_summary"]["page"], 1)
		self.assertEqual(body["query_summary"]["per_page"], 10)

		# Results list and mapped fields
		self.assertEqual(len(body["results"]), 1)
		item = body["results"][0]

		self.assertEqual(item["id"], "W1234567")
		self.assertEqual(item["title"], "Test Paper")
		self.assertEqual(item["year"], 2024)
		self.assertEqual(item["venue"], "Test Venue")
		self.assertEqual(item["doi"], "10.1234/test")
		self.assertTrue(item["is_open_access"])
		self.assertEqual(item["oa_url"], "https://example.org/open-access")

		# Semantic-related fields added by the view
		self.assertIn("per_abstract_sims", item)
		self.assertIn("per_abstract_contribs", item)
		self.assertIn("total_score", item)
		self.assertIn("score", item)

		# Basic sanity on concepts/authors
		self.assertIn("Artificial Intelligence", item["concepts"])
		self.assertIn("Author One", item["authors"])


class OpenAlexKeywordSearchViewTests(APITestCase):
	"""Tests for /api/openalex-keyword-search/ endpoint."""

	@patch("api.views.OpenAlexKeywordSearchView.fetch_openalex_candidates")
	def test_keyword_search_happy_path(self, mock_fetch):
		mock_fetch.return_value = [
			{
				"id": "https://openalex.org/W9999999",
				"display_name": "Keyword Paper",
				"abstract": "kw abstract",
				"doi": "https://doi.org/10.0000/kw",
				"host_venue": {"display_name": "KW Venue"},
				"publication_year": 2020,
				"authorships": [{"author": {"display_name": "KW Author"}}],
				"concepts": [],
				"cited_by_count": 0,
				"referenced_works": [],
				"open_access": {"is_oa": False, "oa_status": "closed"},
				"best_oa_location": {"url": ""},
				"created_date": "2020-01-01",
			}
		]

		url = "/api/openalex-keyword-search/"
		payload = {"keywords": ["ai"], "per_page": 5}

		response = self.client.post(url, data=payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		body = response.json()
		self.assertEqual(body["query"], "ai")
		self.assertEqual(body["keywords"], ["ai"])
		self.assertEqual(body["count"], 1)
		self.assertEqual(len(body["results"]), 1)
		self.assertEqual(body["results"][0]["id"], "W9999999")

	def test_keyword_search_requires_at_least_one_keyword(self):
		url = "/api/openalex-keyword-search/"
		payload = {"keywords": []}

		response = self.client.post(url, data=payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn("detail", response.data)
		self.assertIn("At least one keyword must be provided.", response.data["detail"])


class SubscriptionViewsTests(APITestCase):
	"""Basic tests for subscription create + verify + detail flow."""

	@patch("api.views.SubscriptionsView.send_verification_email")
	def test_create_and_verify_subscription_flow(self, mock_send_email):
		# 1) Create subscription
		create_url = "/api/subscribe-search/"
		payload = {
			"email": "test@example.com",
			"query_name": "My query",
			"abstracts": ["some abstract"],
			"keywords": ["ai"],
			"agree_to_emails": True,
		}

		create_resp = self.client.post(create_url, data=payload, format="json")
		self.assertIn(create_resp.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK))
		body = create_resp.json()
		self.assertIn(body["status"], ["pending_verification", "already_verified"])
		sub_id = body["subscription_id"]

		# 2) Fetch subscription from DB and verify endpoint behavior
		sub = Subscription.objects.get(pk=sub_id)
		self.assertFalse(sub.is_verified)
		token = sub.verification_token

		verify_url = f"/api/subscribe-search/verify/{token}/"
		verify_resp = self.client.get(verify_url, follow=False)
		self.assertIn(verify_resp.status_code, (302, 301))  # redirect to frontend

		# Refresh from DB and ensure it is marked verified
		sub.refresh_from_db()
		self.assertTrue(sub.is_verified)

		# 3) Detail endpoint should now return 200
		detail_url = f"/api/subscriptions/{sub_id}/"
		detail_resp = self.client.get(detail_url)
		self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)

