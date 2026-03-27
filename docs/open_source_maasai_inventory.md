# Open Maasai Source Inventory

This project needs better Maasai coverage, but not all public web material is safe to ingest.
This inventory separates sources by reuse status so model training stays traceable.

## Ready For Ingestion

### 1. A.C. Hollis, *The Masai: their language and folklore* (1905)

- Status: approved for training
- License status: public domain
- URL: `https://archive.org/download/masaitheirlangua00holluoft/masaitheirlangua00holluoft_djvu.txt`
- Current use:
  - proverb translation pairs extracted into `data/raw/public_domain_hollis_proverbs.jsonl`
  - future extraction target for longer folklore and customs passages
- Notes:
  - includes Maa source text with English renderings
  - useful for proverbs, folklore, idioms, and culturally grounded phrasing

### 2. ASJP Maasai Wordlist

- Status: approved for training
- License status: CC BY 4.0
- URL: `https://asjp.clld.org/languages/MAASAI.json`
- Current use:
  - lexical translation pairs extracted into `data/raw/open_asjp_maasai_wordlist.jsonl`
- Notes:
  - compact but clean lexical coverage
  - useful for baseline word translation and vocabulary grounding

## Cached For Next Extraction Pass

### 3. Hildegarde Hinde, *The Masai language: grammatical notes together with a vocabulary* (1901)

- Status: public-domain source, cached but not yet fully parsed
- License status: public domain
- URL: `https://archive.org/download/masailanguagegra00hindrich/masailanguagegra00hindrich_djvu.txt`
- Current use:
  - cached locally for future vocabulary extraction
- Notes:
  - contains a large vocabulary section and grammar material
  - OCR layout is noisier than Hollis and needs a more careful parser before training ingest

## Reference Only For Now

### 4. MasaiMara.ke Learn Maasai Language Guide (January 2025 PDF)

- Status: reference only
- License status: not confirmed for redistribution or training reuse
- URL: `https://masaimara.ke/wp-content/uploads/2025/01/Learn-Maasai-Language-Guide-1.pdf`
- Notes:
  - short practical guide with greetings, numbers, verbs, and travel phrases
  - useful for manual review and evaluation ideas
  - should not be bulk-ingested unless reuse rights are clarified

## Near-Term Ingestion Priorities

1. Extract more Hollis parallel passages beyond proverbs, especially customs and folklore sections.
2. Parse the Hinde vocabulary into conservative bilingual pairs with provenance tags.
3. Promote stable lexical items into glossary-building and Space retrieval layers.
4. Keep modern web guides in a review-only lane unless their license is explicitly open.
