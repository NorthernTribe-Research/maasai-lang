#!/usr/bin/env python3
"""
Discover candidate Maasai media/resources from public APIs with conservative
rights triage.

This script is intentionally discovery-only. It does not scrape arbitrary
sites or download corpora. Instead it queries public APIs, normalizes leads,
and assigns each lead to an approval lane:

- approved_candidate: clear open-reuse signal and public access
- manual_review: useful lead, but rights/access/content still need review
- permission_lane: do not automate; explicit permission or stronger rights
  review is required first
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib import error, parse, request


DEFAULT_OUTPUT = Path("data/registry/maasai_media_intelligence_candidates.json")
DEFAULT_VETTED_REGISTRY = Path("data/registry/maasai_vetted_web_sources.json")
DEFAULT_MAX_PER_PROVIDER = 10
DEFAULT_TIMEOUT_SECONDS = 20
USER_AGENT = "maasai-media-intelligence/1.0 (+https://github.com/NorthernTribe-Research/maasai-lang)"

DEFAULT_QUERY_TERMS = ("maasai", "masai")

MAASAI_MARKERS = (
    "maasai",
)

MASAI_CONTEXT_MARKERS = (
    "language",
    "dictionary",
    "vocabulary",
    "lexicon",
    "wordlist",
    "phrasebook",
    "translation",
    "grammar",
    "folklore",
    "tribe",
    "tribes",
)

LINGUISTIC_CONTENT_MARKERS = (
    "language",
    "dictionary",
    "vocabulary",
    "lexicon",
    "wordlist",
    "phrasebook",
    "phrase",
    "translation",
    "translate",
    "grammar",
    "linguistic",
    "corpus",
    "transcript",
    "transcription",
    "learn",
    "learning",
)

STRICT_TITLE_LINGUISTIC_MARKERS = (
    "language",
    "dictionary",
    "vocabulary",
    "lexicon",
    "wordlist",
    "phrasebook",
    "translation",
    "grammar",
    "corpus",
)

SPEECH_CONTENT_MARKERS = (
    "speech",
    "spoken",
    "voice",
    "audio",
    "pronunciation",
    "reading",
    "speak",
    "speaking",
    "dialogue",
    "conversation",
    "lesson",
    "classroom",
    "singing",
    "song",
    "counting",
)

OPEN_LICENSE_MARKERS = (
    "public domain",
    "public-domain",
    "cc0",
    "cc-0",
    "creative commons zero",
    "cc by",
    "cc-by",
    "attribution 4.0",
    "odc-by",
    "open data commons attribution",
    "pddl",
    "apache-2.0",
    "apache 2.0",
    "mit",
    "bsd-2-clause",
    "bsd-3-clause",
    "bsd",
    "isc",
)

REVIEW_LICENSE_MARKERS = (
    "cc by-sa",
    "cc-by-sa",
    "by-sa",
    "share alike",
    "sharealike",
    "rights review",
    "review required",
    "gated",
    "approval required",
    "contact information required",
    "unspecified",
    "unclear",
    "unknown",
)

PERMISSION_LICENSE_MARKERS = (
    "all rights reserved",
    "no open reuse grant",
    "permission required",
    "preview only",
    "copyrighted",
    "copyright",
    "cc by-nc",
    "cc-by-nc",
    "cc by-nd",
    "cc-by-nd",
    "by-nc",
    "by-nd",
    "by-nc-sa",
    "by-nc-nd",
    "cc by-nc-nd",
    "cc-by-nc-nd",
    "cc by-nc-sa",
    "cc-by-nc-sa",
    "noncommercial",
    "non-commercial",
    "no derivatives",
    "no-derivatives",
    "arr",
    "restricted",
)

OPENVERSE_LICENSE_LABELS = {
    "by": "CC BY",
    "by-sa": "CC BY-SA",
    "by-nd": "CC BY-ND",
    "by-nc": "CC BY-NC",
    "by-nc-sa": "CC BY-NC-SA",
    "by-nc-nd": "CC BY-NC-ND",
    "cc0": "CC0",
    "pdm": "Public Domain Mark",
    "sampling+": "Sampling+",
}

PROVIDER_SEQUENCE = (
    "internet_archive",
    "huggingface_datasets",
    "openverse_audio",
    "github_repositories",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Discover candidate Maasai media/resources via public APIs only."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="JSON output path when not using --stdout.",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Write JSON payload to stdout instead of a file.",
    )
    parser.add_argument(
        "--max-per-provider",
        type=int,
        default=DEFAULT_MAX_PER_PROVIDER,
        help="Maximum normalized leads to keep from each provider.",
    )
    parser.add_argument(
        "--include-existing",
        action="store_true",
        help="Include items that already appear in the vetted registry.",
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=DEFAULT_VETTED_REGISTRY,
        help="Path to the vetted registry used for exclusion/annotation.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help="Per-request timeout in seconds.",
    )
    parser.add_argument(
        "--github-token",
        default=None,
        help="Optional GitHub token. Falls back to GITHUB_TOKEN or GH_TOKEN.",
    )
    return parser.parse_args()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def discovered_on_date() -> str:
    return now_utc().date().isoformat()


def normalize_space(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_title(value: str | None) -> str:
    return normalize_space(value).casefold()


def normalize_title_loose(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", normalize_title(value)).strip()


def normalize_license_value(value: str | None) -> str:
    normalized = normalize_space(value).casefold()
    normalized = normalized.replace("_", "-")
    return normalized


def has_maasai_marker(text: str) -> bool:
    lowered = normalize_space(text).casefold()
    if any(marker in lowered for marker in MAASAI_MARKERS):
        return True
    if re.search(r"\bmasai\b", lowered):
        return any(marker in lowered for marker in MASAI_CONTEXT_MARKERS)
    return False


def has_linguistic_marker(text: str) -> bool:
    lowered = normalize_space(text).casefold()
    return any(marker in lowered for marker in LINGUISTIC_CONTENT_MARKERS)


def has_speech_marker(text: str) -> bool:
    lowered = normalize_space(text).casefold()
    return any(marker in lowered for marker in SPEECH_CONTENT_MARKERS)


def has_title_linguistic_marker(text: str) -> bool:
    lowered = normalize_space(text).casefold()
    return any(marker in lowered for marker in STRICT_TITLE_LINGUISTIC_MARKERS)


def is_relevant_language_lead(*parts: Any, allow_speech_only: bool = True) -> bool:
    combined = " ".join(first_text(part) for part in parts if first_text(part))
    if not combined:
        return False
    if not has_maasai_marker(combined):
        return False
    if has_linguistic_marker(combined):
        return True
    if allow_speech_only and has_speech_marker(combined):
        return True
    return False


def first_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return normalize_space(value)
    if isinstance(value, dict):
        for key in ("label", "name", "id", "title", "value"):
            text = first_text(value.get(key))
            if text:
                return text
        return ""
    if isinstance(value, (list, tuple)):
        for item in value:
            text = first_text(item)
            if text:
                return text
        return ""
    return normalize_space(str(value))


def canonicalize_url(url: str | None) -> str:
    raw = normalize_space(url)
    if not raw:
        return ""
    parts = parse.urlsplit(raw)
    scheme = parts.scheme.lower()
    netloc = parts.netloc.lower()
    path = parts.path or ""
    if path != "/":
        path = path.rstrip("/")
    query_pairs = parse.parse_qsl(parts.query, keep_blank_values=True)
    query = parse.urlencode(sorted(query_pairs))
    return parse.urlunsplit((scheme, netloc, path, query, ""))


def stable_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "lead"


def join_notes(*values: str) -> str:
    parts = [normalize_space(value) for value in values if normalize_space(value)]
    return " ".join(parts)


def make_lead_id(
    source_system: str,
    provider_record_id: str | None,
    title: str,
    landing_url: str | None,
    download_url: str | None,
) -> str:
    base = provider_record_id or title or landing_url or download_url or source_system
    slug = stable_slug(base)[:48]
    fingerprint = "|".join(
        [
            source_system,
            canonicalize_url(landing_url),
            canonicalize_url(download_url),
            normalize_title(title),
        ]
    )
    digest = hashlib.sha1(fingerprint.encode("utf-8")).hexdigest()[:10]
    return f"{source_system}_{slug}_{digest}"


def fetch_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int,
) -> Any:
    request_headers = {
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    }
    if headers:
        request_headers.update(headers)

    full_url = url
    if params:
        query = parse.urlencode(params, doseq=True)
        separator = "&" if "?" in url else "?"
        full_url = f"{url}{separator}{query}"

    req = request.Request(full_url, headers=request_headers)
    try:
        with request.urlopen(req, timeout=timeout) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except error.HTTPError as exc:  # pragma: no cover - depends on live APIs
        body = exc.read().decode("utf-8", errors="replace")
        detail = body.strip() or exc.reason
        raise RuntimeError(f"{exc.code} {detail}") from exc
    except error.URLError as exc:  # pragma: no cover - depends on live APIs
        raise RuntimeError(str(exc.reason)) from exc


def spdx_to_label(spdx_id: str | None) -> str:
    value = normalize_space(spdx_id)
    if not value or value.upper() in {"NOASSERTION", "NONE"}:
        return ""
    if value.upper() == "MIT":
        return "MIT"
    return value


def license_from_hf_tags(tags: Iterable[Any]) -> str:
    for tag in tags:
        text = first_text(tag)
        if text.startswith("license:"):
            return text.split(":", 1)[1]
    return ""


def classify_rights(
    license_text: str | None,
    *,
    access_model: str,
    extra_signals: Iterable[str] | None = None,
) -> dict[str, str]:
    normalized_license = normalize_license_value(license_text)
    normalized_access = normalize_space(access_model).casefold()
    signals = {
        normalize_license_value(signal)
        for signal in (extra_signals or [])
        if normalize_space(signal)
    }

    combined = " ".join([normalized_license, normalized_access, " ".join(sorted(signals))]).strip()
    has_open_license = any(marker in combined for marker in OPEN_LICENSE_MARKERS)
    has_review_signal = (
        any(marker in combined for marker in REVIEW_LICENSE_MARKERS)
        or any(
            signal in signals
            for signal in (
                "metadata-only",
                "historical-public-domain-candidate",
                "mixed-content-repository",
                "share-alike-review",
            )
        )
    )
    has_permission_signal = (
        any(marker in combined for marker in PERMISSION_LICENSE_MARKERS)
        or any(
            signal in signals
            for signal in (
                "permission-requested",
                "preview-only",
                "copyrighted",
            )
        )
    )

    if "permission" in normalized_access or "preview" in normalized_access:
        has_permission_signal = True
    if "gated" in normalized_access or "metadata" in normalized_access or "catalog" in normalized_access:
        has_review_signal = True

    if has_permission_signal:
        return {
            "rights_signal": "permission_required",
            "trainability_lane": "permission_lane",
        }

    if has_open_license and not has_review_signal:
        return {
            "rights_signal": "open_reusable",
            "trainability_lane": "approved_candidate",
        }

    return {
        "rights_signal": "review_required",
        "trainability_lane": "manual_review",
    }


def lead_fingerprints(lead: dict[str, Any]) -> set[str]:
    fingerprints: set[str] = set()
    landing_url = canonicalize_url(lead.get("landing_url"))
    download_url = canonicalize_url(lead.get("download_url"))
    title = normalize_title(lead.get("title"))
    loose_title = normalize_title_loose(lead.get("title"))

    if landing_url:
        fingerprints.add(f"landing:{landing_url}")
    if download_url:
        fingerprints.add(f"download:{download_url}")
    if title:
        fingerprints.add(f"title:{title}")
    if loose_title:
        fingerprints.add(f"title_loose:{loose_title}")
    return fingerprints


def dedupe_leads(leads: Iterable[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    dropped = 0

    for lead in leads:
        fingerprints = lead_fingerprints(lead)
        if fingerprints and seen.intersection(fingerprints):
            dropped += 1
            continue
        seen.update(fingerprints)
        deduped.append(lead)

    return deduped, dropped


def load_vetted_registry(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"sources": []}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload.get("sources"), list):
        return {"sources": []}
    return payload


def vetted_source_fingerprints(source: dict[str, Any]) -> set[str]:
    access = source.get("access", {})
    candidate = {
        "title": source.get("title"),
        "landing_url": access.get("landing_url") or access.get("source_page_url"),
        "download_url": access.get("download_url"),
    }
    return lead_fingerprints(candidate)


def build_vetted_index(vetted_sources: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for source in vetted_sources:
        for fingerprint in vetted_source_fingerprints(source):
            index.setdefault(fingerprint, source)
    return index


def filter_existing_sources(
    leads: Iterable[dict[str, Any]],
    vetted_sources: Iterable[dict[str, Any]],
    *,
    include_existing: bool,
) -> tuple[list[dict[str, Any]], int]:
    vetted_index = build_vetted_index(vetted_sources)
    filtered: list[dict[str, Any]] = []
    skipped = 0

    for lead in leads:
        match = None
        for fingerprint in lead_fingerprints(lead):
            match = vetted_index.get(fingerprint)
            if match is not None:
                break

        if match is None:
            filtered.append(lead)
            continue

        annotated = dict(lead)
        annotated_evidence = dict(annotated.get("evidence") or {})
        annotated_evidence["existing_registry_id"] = match.get("id")
        annotated["evidence"] = annotated_evidence
        annotated["notes"] = join_notes(
            annotated.get("notes"),
            f"Already present in vetted registry as '{match.get('id', 'unknown')}'.",
        )

        if include_existing:
            filtered.append(annotated)
        else:
            skipped += 1

    return filtered, skipped


def internet_archive_download_url(identifier: str, media_type: str) -> str:
    if media_type == "text":
        return f"https://archive.org/download/{identifier}/{identifier}_djvu.txt"
    return ""


def normalize_internet_archive_doc(doc: dict[str, Any], query: str) -> dict[str, Any] | None:
    identifier = first_text(doc.get("identifier"))
    title = first_text(doc.get("title")) or identifier
    if not identifier or not title:
        return None
    if not has_title_linguistic_marker(title):
        return None

    if not is_relevant_language_lead(
        title,
        doc.get("description"),
        doc.get("subject"),
        allow_speech_only=False,
    ):
        return None

    mediatype = first_text(doc.get("mediatype")).casefold()
    media_type = "audio" if mediatype == "audio" else "text"
    source_type = "archival_audio" if media_type == "audio" else "archival_text"
    landing_url = f"https://archive.org/details/{identifier}"
    download_url = internet_archive_download_url(identifier, media_type)
    access_model = "public_download" if download_url else "public_catalog"

    raw_license = first_text(doc.get("licenseurl")) or first_text(doc.get("rights"))
    publication_year = first_text(doc.get("year"))
    signals: list[str] = []
    notes = "Internet Archive discovery lead. Review item metadata before any download planning."
    if publication_year and publication_year.isdigit() and int(publication_year) <= 1929 and not raw_license:
        signals.append("historical-public-domain-candidate")
        notes = join_notes(notes, "Historical publication year suggests a public-domain candidate, but this script keeps it in review unless license status is explicit.")
    if not download_url:
        signals.append("metadata-only")

    classification = classify_rights(
        raw_license or publication_year,
        access_model=access_model,
        extra_signals=signals,
    )

    return {
        "id": make_lead_id("internet_archive", identifier, title, landing_url, download_url),
        "title": title,
        "source_system": "internet_archive",
        "source_type": source_type,
        "media_type": media_type,
        "landing_url": landing_url,
        "download_url": download_url or None,
        "license": raw_license or "unspecified",
        "rights_signal": classification["rights_signal"],
        "access_model": access_model,
        "trainability_lane": classification["trainability_lane"],
        "discovered_on": discovered_on_date(),
        "evidence": {
            "provider_record_id": identifier,
            "query": query,
            "publication_year": publication_year or None,
            "license_url": first_text(doc.get("licenseurl")) or None,
            "raw_rights": first_text(doc.get("rights")) or None,
        },
        "notes": notes,
    }


def discover_internet_archive(*, max_results: int, timeout: int) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    for query_term in DEFAULT_QUERY_TERMS:
        search_query = (
            f'(title:({query_term}) OR description:({query_term}) OR subject:({query_term})) '
            "AND (title:(language OR dictionary OR vocabulary OR grammar OR lexicon OR wordlist OR phrasebook OR translation OR speech) "
            "OR description:(language OR dictionary OR vocabulary OR grammar OR lexicon OR wordlist OR phrasebook OR translation OR speech) "
            "OR subject:(language OR dictionary OR vocabulary OR grammar OR lexicon OR wordlist OR phrasebook OR translation OR speech)) "
            "AND mediatype:(texts OR audio)"
        )
        payload = fetch_json(
            "https://archive.org/advancedsearch.php",
            params={
                "q": search_query,
                "fl[]": [
                    "identifier",
                    "title",
                    "mediatype",
                    "creator",
                    "year",
                    "licenseurl",
                    "rights",
                    "description",
                    "subject",
                ],
                "rows": max_results,
                "page": 1,
                "output": "json",
                "sort[]": "downloads desc",
            },
            timeout=timeout,
        )
        docs = ((payload or {}).get("response") or {}).get("docs") or []
        for doc in docs:
            normalized = normalize_internet_archive_doc(doc, query_term)
            if normalized is not None:
                collected.append(normalized)
        collected, _ = dedupe_leads(collected)
        if len(collected) >= max_results:
            break
    return collected[:max_results]


def hf_media_type(tags: Iterable[Any]) -> str:
    tag_text = " ".join(first_text(tag).casefold() for tag in tags)
    if any(marker in tag_text for marker in ("audio", "asr", "speech")):
        return "audio"
    if "text" in tag_text or "translation" in tag_text:
        return "text"
    return "dataset"


def normalize_hf_dataset_item(item: dict[str, Any], query: str) -> dict[str, Any] | None:
    dataset_id = first_text(item.get("id"))
    if not dataset_id:
        return None
    if dataset_id.casefold().startswith("northerntribe-research/"):
        return None

    tags = item.get("tags") or []
    card_data = item.get("cardData") or {}
    media_type = hf_media_type(tags)
    title = first_text(card_data.get("dataset_name")) or dataset_id
    if not is_relevant_language_lead(
        dataset_id,
        title,
        card_data.get("description"),
        tags,
        allow_speech_only=True,
    ):
        return None
    landing_url = f"https://huggingface.co/datasets/{dataset_id}"
    gated = bool(item.get("gated"))
    access_model = "gated_dataset_repository" if gated else "public_dataset_repository"

    license_text = (
        first_text(card_data.get("license"))
        or first_text(item.get("license"))
        or license_from_hf_tags(tags)
        or "unspecified"
    )
    signals: list[str] = []
    notes = "Hugging Face dataset discovery lead. Review card content, intended use, and split contents before any training use."
    if gated:
        signals.append("gated")

    classification = classify_rights(
        license_text,
        access_model=access_model,
        extra_signals=signals,
    )
    notes = "Openverse audio discovery lead. Review the original source page for content fit and attribution requirements."
    if classification["trainability_lane"] == "approved_candidate":
        # Open-licensed voice recordings can still involve consent and cultural-sensitivity constraints.
        classification = {
            "rights_signal": "review_required",
            "trainability_lane": "manual_review",
        }
        notes = join_notes(
            notes,
            "Open license detected, but voice data still requires manual consent/privacy review before ingestion.",
        )

    return {
        "id": make_lead_id("huggingface", dataset_id, title, landing_url, None),
        "title": title,
        "source_system": "huggingface",
        "source_type": "dataset_repository",
        "media_type": media_type,
        "landing_url": landing_url,
        "download_url": None,
        "license": license_text,
        "rights_signal": classification["rights_signal"],
        "access_model": access_model,
        "trainability_lane": classification["trainability_lane"],
        "discovered_on": discovered_on_date(),
        "evidence": {
            "provider_record_id": dataset_id,
            "query": query,
            "gated": gated,
            "tags": [first_text(tag) for tag in tags[:12]],
        },
        "notes": notes,
    }


def discover_huggingface_datasets(*, max_results: int, timeout: int) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    for query_term in DEFAULT_QUERY_TERMS:
        payload = fetch_json(
            "https://huggingface.co/api/datasets",
            params={"search": query_term, "limit": max_results},
            timeout=timeout,
        )
        for item in payload or []:
            normalized = normalize_hf_dataset_item(item, query_term)
            if normalized is not None:
                collected.append(normalized)
        collected, _ = dedupe_leads(collected)
        if len(collected) >= max_results:
            break
    return collected[:max_results]


def openverse_license_label(raw_license: str) -> str:
    value = normalize_license_value(raw_license)
    if not value:
        return "unspecified"
    return OPENVERSE_LICENSE_LABELS.get(value, raw_license)


def normalize_openverse_item(item: dict[str, Any], query: str) -> dict[str, Any] | None:
    provider_id = first_text(item.get("id"))
    title = first_text(item.get("title")) or provider_id
    if not provider_id or not title:
        return None

    if not is_relevant_language_lead(
        title,
        item.get("tags"),
        item.get("creator"),
        allow_speech_only=True,
    ):
        return None

    landing_url = first_text(item.get("foreign_landing_url")) or first_text(item.get("detail_url"))
    download_url = first_text(item.get("url"))
    access_model = "public_download" if download_url else "public_catalog"
    raw_license = first_text(item.get("license"))
    license_text = openverse_license_label(raw_license)
    signals: list[str] = []
    notes = "Openverse audio discovery lead. Review the original source page for content fit and attribution requirements."
    if not download_url:
        signals.append("metadata-only")

    classification = classify_rights(
        license_text,
        access_model=access_model,
        extra_signals=signals,
    )
    if classification["trainability_lane"] == "approved_candidate":
        # Open-licensed voice recordings can still involve consent and cultural-sensitivity constraints.
        classification = {
            "rights_signal": "review_required",
            "trainability_lane": "manual_review",
        }
        notes = join_notes(
            notes,
            "Open license detected, but voice data still requires manual consent/privacy review before ingestion.",
        )

    return {
        "id": make_lead_id("openverse", provider_id, title, landing_url, download_url),
        "title": title,
        "source_system": "openverse",
        "source_type": "audio_recording",
        "media_type": "audio",
        "landing_url": landing_url or None,
        "download_url": download_url or None,
        "license": license_text,
        "rights_signal": classification["rights_signal"],
        "access_model": access_model,
        "trainability_lane": classification["trainability_lane"],
        "discovered_on": discovered_on_date(),
        "evidence": {
            "provider_record_id": provider_id,
            "query": query,
            "creator": first_text(item.get("creator")) or None,
            "license_url": first_text(item.get("license_url")) or None,
            "source": first_text(item.get("source")) or None,
        },
        "notes": notes,
    }


def discover_openverse_audio(*, max_results: int, timeout: int) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    for query_term in ("maasai",):
        payload = fetch_json(
            "https://api.openverse.org/v1/audio/",
            params={"q": query_term, "page_size": max_results},
            timeout=timeout,
        )
        for item in (payload or {}).get("results") or []:
            normalized = normalize_openverse_item(item, query_term)
            if normalized is not None:
                collected.append(normalized)
        collected, _ = dedupe_leads(collected)
        if len(collected) >= max_results:
            break
    return collected[:max_results]


def normalize_github_repository_item(item: dict[str, Any], query: str) -> dict[str, Any] | None:
    repo_name = first_text(item.get("full_name"))
    title = first_text(item.get("name")) or repo_name
    landing_url = first_text(item.get("html_url"))
    if not repo_name or not title or not landing_url:
        return None
    if repo_name.casefold().startswith("northerntribe-research/"):
        return None

    if not is_relevant_language_lead(
        repo_name,
        title,
        item.get("description"),
        item.get("topics"),
        allow_speech_only=False,
    ):
        return None

    spdx = spdx_to_label(((item.get("license") or {}).get("spdx_id")))
    license_text = spdx or first_text(((item.get("license") or {}).get("name"))) or "unspecified"
    classification = classify_rights(
        license_text,
        access_model="public_repository",
        extra_signals=["mixed-content-repository"],
    )

    return {
        "id": make_lead_id("github", repo_name, title, landing_url, item.get("clone_url")),
        "title": title,
        "source_system": "github",
        "source_type": "repository",
        "media_type": "code",
        "landing_url": landing_url,
        "download_url": first_text(item.get("clone_url")) or first_text(item.get("svn_url")) or None,
        "license": license_text,
        "rights_signal": classification["rights_signal"],
        "access_model": "public_repository",
        "trainability_lane": classification["trainability_lane"],
        "discovered_on": discovered_on_date(),
        "evidence": {
            "provider_record_id": repo_name,
            "query": query,
            "description": first_text(item.get("description")) or None,
            "stars": item.get("stargazers_count"),
            "topics": item.get("topics") or [],
        },
        "notes": "GitHub repository discovery lead. Repository contents may be mixed and require manual inspection before any corpus use.",
    }


def discover_github_repositories(
    *,
    max_results: int,
    timeout: int,
    github_token: str | None,
) -> list[dict[str, Any]]:
    headers: dict[str, str] = {"Accept": "application/vnd.github+json"}
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    collected: list[dict[str, Any]] = []
    queries = (
        "maasai language in:name,description,readme",
        "masai language in:name,description,readme",
        "maasai dictionary in:name,description,readme",
        "maasai translation in:name,description,readme",
    )
    for query_term in queries:
        payload = fetch_json(
            "https://api.github.com/search/repositories",
            params={
                "q": query_term,
                "sort": "stars",
                "order": "desc",
                "per_page": max_results,
            },
            headers=headers,
            timeout=timeout,
        )
        for item in (payload or {}).get("items") or []:
            normalized = normalize_github_repository_item(item, query_term)
            if normalized is not None:
                collected.append(normalized)
        collected, _ = dedupe_leads(collected)
        if len(collected) >= max_results:
            break
    return collected[:max_results]


def discover_provider(
    provider: str,
    *,
    max_results: int,
    timeout: int,
    github_token: str | None,
) -> list[dict[str, Any]]:
    if max_results <= 0:
        return []
    if provider == "internet_archive":
        return discover_internet_archive(max_results=max_results, timeout=timeout)
    if provider == "huggingface_datasets":
        return discover_huggingface_datasets(max_results=max_results, timeout=timeout)
    if provider == "openverse_audio":
        return discover_openverse_audio(max_results=max_results, timeout=timeout)
    if provider == "github_repositories":
        return discover_github_repositories(
            max_results=max_results,
            timeout=timeout,
            github_token=github_token,
        )
    raise ValueError(f"Unsupported provider: {provider}")


def build_summary(
    leads: Iterable[dict[str, Any]],
    *,
    provider_errors: list[dict[str, str]],
    skipped_existing: int,
    deduped_count: int,
) -> dict[str, Any]:
    provider_counts = Counter(lead.get("source_system", "unknown") for lead in leads)
    lane_counts = Counter(lead.get("trainability_lane", "unknown") for lead in leads)
    rights_counts = Counter(lead.get("rights_signal", "unknown") for lead in leads)
    access_counts = Counter(lead.get("access_model", "unknown") for lead in leads)

    return {
        "candidate_count": sum(provider_counts.values()),
        "provider_counts": dict(sorted(provider_counts.items())),
        "trainability_lane_counts": dict(sorted(lane_counts.items())),
        "rights_signal_counts": dict(sorted(rights_counts.items())),
        "access_model_counts": dict(sorted(access_counts.items())),
        "skipped_existing_count": skipped_existing,
        "deduped_count": deduped_count,
        "provider_failures": provider_errors,
    }


def print_summary(summary: dict[str, Any]) -> None:
    print("Discovery summary", file=sys.stderr)
    print(f"- candidates: {summary['candidate_count']}", file=sys.stderr)
    print(f"- deduped: {summary['deduped_count']}", file=sys.stderr)
    print(f"- skipped_existing: {summary['skipped_existing_count']}", file=sys.stderr)

    if summary["provider_counts"]:
        providers = ", ".join(
            f"{provider}={count}"
            for provider, count in sorted(summary["provider_counts"].items())
        )
        print(f"- providers: {providers}", file=sys.stderr)

    if summary["trainability_lane_counts"]:
        lanes = ", ".join(
            f"{lane}={count}"
            for lane, count in sorted(summary["trainability_lane_counts"].items())
        )
        print(f"- lanes: {lanes}", file=sys.stderr)

    if summary["provider_failures"]:
        failures = ", ".join(
            f"{entry['provider']}: {entry['error']}"
            for entry in summary["provider_failures"]
        )
        print(f"- provider_failures: {failures}", file=sys.stderr)


def build_output_payload(
    leads: list[dict[str, Any]],
    *,
    max_per_provider: int,
    include_existing: bool,
    registry_path: Path,
    provider_errors: list[dict[str, str]],
    skipped_existing: int,
    deduped_count: int,
) -> dict[str, Any]:
    summary = build_summary(
        leads,
        provider_errors=provider_errors,
        skipped_existing=skipped_existing,
        deduped_count=deduped_count,
    )
    return {
        "registry_id": "maasai_media_intelligence_candidates",
        "registry_version": 1,
        "generated_at": now_utc().isoformat(),
        "generated_on": discovered_on_date(),
        "scope": "Candidate Maasai media/resource leads discovered via public APIs for rights-aware review only.",
        "policy": {
            "goal": "Discovery and triage, not indiscriminate scraping.",
            "default_action": "review_before_download",
            "open_lane": "approved_candidate",
            "review_lane": "manual_review",
            "permission_lane": "permission_lane",
        },
        "inputs": {
            "vetted_registry": str(registry_path),
            "max_per_provider": max_per_provider,
            "include_existing": include_existing,
            "providers": list(PROVIDER_SEQUENCE),
            "query_terms": list(DEFAULT_QUERY_TERMS),
        },
        "summary": summary,
        "sources": leads,
    }


def write_payload(payload: dict[str, Any], *, output_path: Path, to_stdout: bool) -> None:
    rendered = json.dumps(payload, indent=2, ensure_ascii=False)
    if to_stdout:
        sys.stdout.write(rendered + "\n")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered + "\n", encoding="utf-8")
    print(f"Wrote discovery registry to {output_path}", file=sys.stderr)


def main() -> None:
    args = parse_args()
    github_token = args.github_token or os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")

    provider_errors: list[dict[str, str]] = []
    all_leads: list[dict[str, Any]] = []

    for provider in PROVIDER_SEQUENCE:
        try:
            provider_leads = discover_provider(
                provider,
                max_results=args.max_per_provider,
                timeout=args.timeout,
                github_token=github_token,
            )
            all_leads.extend(provider_leads)
        except Exception as exc:  # pragma: no cover - depends on live APIs
            provider_errors.append({"provider": provider, "error": str(exc)})

    deduped_leads, deduped_count = dedupe_leads(all_leads)
    vetted_registry = load_vetted_registry(args.registry)
    filtered_leads, skipped_existing = filter_existing_sources(
        deduped_leads,
        vetted_registry.get("sources", []),
        include_existing=args.include_existing,
    )
    filtered_leads = sorted(
        filtered_leads,
        key=lambda lead: (
            str(lead.get("source_system", "")),
            normalize_title(str(lead.get("title") or "")),
            canonicalize_url(str(lead.get("landing_url") or "")),
        ),
    )
    summary = build_summary(
        filtered_leads,
        provider_errors=provider_errors,
        skipped_existing=skipped_existing,
        deduped_count=deduped_count,
    )
    payload = build_output_payload(
        filtered_leads,
        max_per_provider=args.max_per_provider,
        include_existing=args.include_existing,
        registry_path=args.registry,
        provider_errors=provider_errors,
        skipped_existing=skipped_existing,
        deduped_count=deduped_count,
    )

    write_payload(payload, output_path=args.output, to_stdout=args.stdout)
    print_summary(summary)


if __name__ == "__main__":
    main()
