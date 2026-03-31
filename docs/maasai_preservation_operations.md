# Maasai Preservation Operations

This document defines the operating rules for lawful, traceable Maasai language preservation work in this repository.
The goal is durable community benefit, not blind scraping or opportunistic corpus growth.

## Core Rules

- Discovery is broader than ingest. Finding a lead does not authorize downloading, parsing, training, or publishing it.
- Provenance is mandatory. Every retained artifact must be traceable back to a source page, file, or permission record.
- Rights review comes before ingestion. If reuse terms are unclear, the source stays out of automated ingest.
- Community review matters. Linguistically or culturally sensitive material is not promoted on rights analysis alone.
- Human voice, minors, and sacred or ceremonial material require elevated review.

## Acquisition Lifecycle

| Stage | Purpose | What must be captured | Automation allowed | Manual gate |
| --- | --- | --- | --- | --- |
| `discover` | Find candidate sources and record leads | source URL, title, discovered date, why it matters | search, metadata capture, registry drafting | none for metadata-only discovery |
| `triage` | Classify the lead | source type, language fit, likely rights posture, sensitivity flags | schema checks, duplicate detection | yes |
| `verify_rights` | Confirm lawful reuse basis | license, rights basis, evidence URL, reviewer, date reviewed | evidence collection helpers only | yes, always |
| `ingest` | Acquire and transform approved material | checksum, retrieval date, original filename, transform log, source segments/pages | download, OCR, parsing, transcription only for approved items | yes |
| `review` | Validate quality and appropriateness | linguistic notes, community review notes, exclusions, approver | validation scripts, dedupe checks | yes |
| `publish` | Release derived assets or approved originals | citation, license notice, source IDs, release date, removal path | packaging and manifest generation | yes, final approval |

## Status Model

- `approved`: rights basis is documented and the source may enter controlled ingest lanes defined in its registry record.
- `gated_access`: the source appears promising, but access, contract terms, or explicit approval must be completed first.
- `reference_only`: the source may inform bibliography, evaluation, UI, or architecture work, but not data ingest.

Promotion from candidate to approved source requires both rights verification and human review.

## Retention And Provenance Requirements

For every source or artifact retained in this project, keep:

- a stable source identifier in a registry file
- landing URL and, when applicable, direct download URL
- retrieval timestamp and retriever identity
- checksum or file hash for downloaded artifacts
- rights basis with evidence URLs and reviewer/date
- source segmentation metadata such as page numbers, timestamps, or row IDs
- transformation history for OCR, parsing, normalization, filtering, and dataset assembly
- approval status and approval date

For derived training rows, preserve row-level or batch-level links back to the source record wherever feasible.

## Community Review Process

Community review is required before publishing or training on:

- newly ingested Maasai lexical or parallel-text material
- human voice recordings
- child speech, school recordings, or identifiable speakers
- proverbs, ceremonial, sacred, clan-specific, or otherwise culturally sensitive material

Minimum review process:

1. Rights reviewer confirms lawful reuse basis.
2. Language reviewer checks transcription, translation, and dialect labeling.
3. Community or cultural reviewer flags restricted, sacred, exploitative, or context-dependent content.
4. Operations owner records the decision, exclusions, and publication lane.

Any reviewer may place a source in `reference_only` pending clarification.

## Risk Controls

### Copyright And Contract Risk

- Do not ingest from public web pages merely because content is visible.
- Do not infer reuse rights from search-engine indexing, AI-generated summaries, or repository visibility.
- Archive the exact rights evidence used for approval.
- If an item mixes open code with non-open data, treat code and data as separate rights surfaces.

### Privacy And Voice Consent

- Human voice data needs a documented rights and consent basis, not just a downloadable file.
- Child voices, classrooms, or community gatherings require heightened review even if a platform license looks permissive.
- Remove or avoid material that exposes personal identifiers, precise location traces, or sensitive personal narratives unless explicitly allowed.

### Cultural Sensitivity

- Do not automate ingestion of ceremonial, sacred, or context-bound material.
- Historical colonial vocabularies must be labeled as historical and reviewed before mixing with contemporary Maa resources.
- Community reviewers can require partial exclusion, redaction, or non-public storage.

## What Can Be Automated

- discovery of candidate links and bibliographic metadata
- registry population drafts
- checksuming, file inventory, and schema validation
- OCR, parsing, and transcription of already approved sources
- deduplication, format conversion, and provenance-manifest generation

## What Requires Manual Approval

- first-pass rights classification
- permission outreach and contract acceptance
- promotion of a candidate source into an ingest lane
- any ingest involving human voice, minors, or culturally sensitive material
- publication of datasets, models, or public demos containing new source-derived content

## Registry Use

- `data/registry/maasai_candidate_media_sources.json` tracks newly discovered leads and items awaiting review.
- `data/registry/maasai_media_intelligence_candidates.json` tracks automated API-discovery outputs generated by `scripts/discover_maasai_media_intelligence.py`.
- `data/registry/maasai_vetted_web_sources.json` tracks sources that already have a reviewed ingestion posture.

The candidate registries are the discovery queue.
The vetted registry is the approved or explicitly classified operating record.

## Operational Default

If rights are unclear, or if privacy or cultural sensitivity cannot be resolved from available evidence:

- do not download in bulk
- do not ingest automatically
- do not publish derived artifacts
- keep the item in `gated_access` or `reference_only` until reviewed
