from __future__ import annotations

import unittest

from scripts.discover_maasai_media_intelligence import (
    classify_rights,
    dedupe_leads,
    filter_existing_sources,
    is_relevant_language_lead,
)


class RightsClassificationTests(unittest.TestCase):
    def test_open_license_with_public_download_is_approved(self) -> None:
        result = classify_rights(
            "CC BY 4.0",
            access_model="public_download",
        )

        self.assertEqual(result["rights_signal"], "open_reusable")
        self.assertEqual(result["trainability_lane"], "approved_candidate")

    def test_share_alike_license_stays_in_manual_review(self) -> None:
        result = classify_rights(
            "CC BY-SA 4.0",
            access_model="public_download",
        )

        self.assertEqual(result["rights_signal"], "review_required")
        self.assertEqual(result["trainability_lane"], "manual_review")

    def test_permission_signals_override_public_access(self) -> None:
        result = classify_rights(
            "No open reuse grant found",
            access_model="preview_only",
        )

        self.assertEqual(result["rights_signal"], "permission_required")
        self.assertEqual(result["trainability_lane"], "permission_lane")

    def test_gated_open_license_stays_in_review(self) -> None:
        result = classify_rights(
            "CC BY 4.0",
            access_model="gated_dataset_repository",
        )

        self.assertEqual(result["rights_signal"], "review_required")
        self.assertEqual(result["trainability_lane"], "manual_review")

    def test_by_nc_license_requires_permission_lane(self) -> None:
        result = classify_rights(
            "CC BY-NC",
            access_model="public_download",
        )

        self.assertEqual(result["rights_signal"], "permission_required")
        self.assertEqual(result["trainability_lane"], "permission_lane")


class RelevanceFilterTests(unittest.TestCase):
    def test_relevance_accepts_maasai_language_resource(self) -> None:
        self.assertTrue(
            is_relevant_language_lead("Learn Maasai language app")
        )

    def test_relevance_accepts_maasai_speech_material(self) -> None:
        self.assertTrue(
            is_relevant_language_lead("Maasai School Kids Singing")
        )

    def test_relevance_rejects_non_linguistic_maasai_content(self) -> None:
        self.assertFalse(
            is_relevant_language_lead("Maasai Camp Nature Sounds Africa")
        )

    def test_relevance_rejects_unrelated_repo(self) -> None:
        self.assertFalse(
            is_relevant_language_lead("awesome-python list of curated Python resources")
        )


class DedupeTests(unittest.TestCase):
    def test_duplicate_landing_url_is_removed(self) -> None:
        leads = [
            {
                "title": "Maa Speech Corpus",
                "landing_url": "https://example.org/resource",
                "download_url": "https://example.org/file-a.wav",
            },
            {
                "title": "Maa Speech Corpus Copy",
                "landing_url": "https://example.org/resource/",
                "download_url": "https://example.org/file-b.wav",
            },
            {
                "title": "Different Lead",
                "landing_url": "https://example.org/other",
                "download_url": "https://example.org/other.wav",
            },
        ]

        deduped, dropped = dedupe_leads(leads)

        self.assertEqual(len(deduped), 2)
        self.assertEqual(dropped, 1)
        self.assertEqual(deduped[0]["title"], "Maa Speech Corpus")
        self.assertEqual(deduped[1]["title"], "Different Lead")

    def test_duplicate_title_without_urls_is_removed(self) -> None:
        leads = [
            {
                "title": "Maasai Oral History Collection",
                "landing_url": None,
                "download_url": None,
            },
            {
                "title": "  Maasai   Oral History Collection  ",
                "landing_url": None,
                "download_url": None,
            },
        ]

        deduped, dropped = dedupe_leads(leads)

        self.assertEqual(len(deduped), 1)
        self.assertEqual(dropped, 1)


class ExistingRegistryTests(unittest.TestCase):
    def test_existing_vetted_source_is_excluded_by_default(self) -> None:
        leads = [
            {
                "title": "The Masai: their language and folklore",
                "landing_url": "https://openlibrary.org/books/OL7217989M/The_Masai",
                "download_url": "https://archive.org/download/masaitheirlangua00holluoft/masaitheirlangua00holluoft_djvu.txt",
                "evidence": {},
                "notes": "",
            },
            {
                "title": "New Candidate",
                "landing_url": "https://example.org/new",
                "download_url": "https://example.org/new.json",
                "evidence": {},
                "notes": "",
            },
        ]
        vetted_sources = [
            {
                "id": "hollis_1905_folklore_archive",
                "title": "The Masai: their language and folklore",
                "access": {
                    "landing_url": "https://openlibrary.org/books/OL7217989M/The_Masai",
                    "download_url": "https://archive.org/download/masaitheirlangua00holluoft/masaitheirlangua00holluoft_djvu.txt",
                },
            }
        ]

        filtered, skipped = filter_existing_sources(
            leads,
            vetted_sources,
            include_existing=False,
        )

        self.assertEqual(skipped, 1)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["title"], "New Candidate")

    def test_existing_vetted_source_can_be_included_with_annotation(self) -> None:
        leads = [
            {
                "title": "ASJP Database: Maasai wordlist",
                "landing_url": "https://asjp.clld.org/languages/MAASAI",
                "download_url": "https://asjp.clld.org/languages/MAASAI.json",
                "evidence": {},
                "notes": "",
            }
        ]
        vetted_sources = [
            {
                "id": "asjp_maasai_wordlist",
                "title": "ASJP Database: Maasai wordlist",
                "access": {
                    "landing_url": "https://asjp.clld.org/languages/MAASAI",
                    "download_url": "https://asjp.clld.org/languages/MAASAI.json",
                },
            }
        ]

        filtered, skipped = filter_existing_sources(
            leads,
            vetted_sources,
            include_existing=True,
        )

        self.assertEqual(skipped, 0)
        self.assertEqual(len(filtered), 1)
        self.assertEqual(
            filtered[0]["evidence"]["existing_registry_id"],
            "asjp_maasai_wordlist",
        )
        self.assertIn("Already present in vetted registry", filtered[0]["notes"])


if __name__ == "__main__":
    unittest.main()
