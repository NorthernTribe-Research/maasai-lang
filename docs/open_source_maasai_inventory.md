# Open Maasai Source Inventory

This project should not blindly “scrape the whole internet.”
It should expand through a lawful, source-traceable acquisition pipeline:

- ingest only sources that are clearly reusable
- keep gated, copyrighted, or unclear-rights sources out of automatic training
- separate “download now”, “parse next”, “request access”, and “reference only” lanes

The machine-readable registry for this workflow lives at:

- `data/registry/maasai_vetted_web_sources.json`
- `data/registry/maasai_candidate_media_sources.json`
- `data/registry/maasai_media_intelligence_candidates.json`

The planning helper for this workflow lives at:

- `scripts/discover_vetted_maasai_sources.py`

## Approved For Training Now

### 1. A.C. Hollis, *The Masai: their language and folklore* (1905)

- Status: approved for training
- License status: public domain
- URL: `https://archive.org/download/masaitheirlangua00holluoft/masaitheirlangua00holluoft_djvu.txt`
- Current use:
  - proverb translation pairs extracted into `data/raw/public_domain_hollis_proverbs.jsonl`
- Best next use:
  - conservative extraction of additional folklore/customs parallel passages

### 2. ASJP Maasai Wordlist

- Status: approved for training
- License status: CC BY 4.0
- URL: `https://asjp.clld.org/languages/MAASAI.json`
- Current use:
  - lexical translation pairs extracted into `data/raw/open_asjp_maasai_wordlist.jsonl`
- Best next use:
  - continue lexical grounding and glossary expansion

## Expand Next

### 3. Hildegarde Hinde, *The Masai language: grammatical notes together with a vocabulary* (1901)

- Status: approved for conservative training ingest
- License status: public domain
- URL: `https://archive.org/download/masailanguagegra00hindrich/masailanguagegra00hindrich_djvu.txt`
- Current use:
  - conservative vocabulary pairs extracted into `data/raw/public_domain_hinde_vocabulary.jsonl`
- Best next use:
  - extend coverage only after reviewing earlier alphabet blocks and mixed-layout OCR pages
- Caution:
  - do not chunk OCR prose blindly or promote noisy grammar pages into MT training

## Request Access Next

### 4. African Next Voices: Pilot Data Collection in Kenya

- Status: gated-access
- License status: CC BY 4.0
- URL: `https://huggingface.co/datasets/MCAA1-MSU/anv_data_ke`
- Value:
  - 505 Maasai hours listed on the dataset card
  - scripted Maasai with English translation fields
  - fully transcribed unscripted Maasai speech
- Best next use:
  - request access for ASR training and speech evaluation

### 5. Maa Maasai Language Project (University of Oregon)

- Status: permission / access request
- License status: copyrighted
- URL: `https://pages.uoregon.edu/maasai/`
- Value:
  - dictionary and text catalogue
  - multiple dialects and strong linguistic quality
- Caution:
  - the site asks users not to copy without acknowledgment
- Best next use:
  - contact maintainers for explicit permission before ingestion

## Policy Review / Permission Required

### 6. Universal Declaration of Human Rights: translation into Maa (2023)

- Status: policy review
- License status: review before bulk training use
- URL: `https://searchlibrary.ohchr.org/record/30740`
- Value:
  - high-value modern parallel text
- Best next use:
  - evaluation/reference first, then confirm reuse policy before ingestion

### 7. Wikitongues Maasai sample on Wikimedia Commons

- Status: policy review
- License status: CC BY-SA 4.0
- URL: `https://commons.wikimedia.org/wiki/File:Massai.ogg`
- Value:
  - small public Maa speech sample for ASR/demo checks
- Best next use:
  - evaluation/demo use unless share-alike policy is cleared for training use

## Reference Only For Now

### 8. Frans Mol, *Maasai Language & Culture: Dictionary* (Google Books preview)

- Status: reference / clearance lead
- License status: no open reuse grant found
- URL: `https://books.google.com/books/about/Maasai_Language_Culture.html?id=22kOAAAAYAAJ`
- Best next use:
  - bibliographic lead only unless rights are cleared with the rightsholder

### 9. MasaiMara.ke Learn Maasai Language Guide (January 2025 PDF)

- Status: reference only
- License status: not confirmed for redistribution or training reuse
- URL: `https://masaimara.ke/wp-content/uploads/2025/01/Learn-Maasai-Language-Guide-1.pdf`
- Best next use:
  - manual review, prompt ideas, and evaluation examples only

## Newly Identified Leads

These are discovery leads, not blanket approval to harvest.
For aggregators such as Openverse, discovery may be automated, but download and ingest still require upstream rights verification and sensitivity review.

### 10. Internet Archive 1857 vocabulary resource: *Vocabulary of the enguduk iloigob, as spoken by the Masai-tribes in East-Africa*

- Status: approved for conservative lexicon review
- Action lane: parse next
- URL: `https://archive.org/download/vocabularyofengu00erha/vocabularyofengu00erha.pdf`
- Rights notes:
  - public-domain 1857 vocabulary scan
  - historical Wakuafi / Iloigob labeling and colonial orthography mean this must be stored as historical Maa/Iloikop material, not silently merged into modern prompts or evaluation sets
- Best next use:
  - page-level OCR review and extraction of only high-confidence vocabulary pairs with page citations preserved in the manifest

### 11. Cal Poly Humboldt Maasai Dictionary page

- Status: reference_only pending rights clarification
- Action lane: rights review / permission outreach
- URL: `https://www.humboldt.edu/press/maasai-dictionary`
- Rights notes:
  - full text is publicly downloadable through Cal Poly Humboldt Digital Commons
  - the press policy says works are published online under a Creative Commons license chosen by the author, but the item page does not surface which license applies to this specific dictionary
  - do not ingest until the exact reuse grant is documented
- Best next use:
  - inspect the PDF colophon and/or contact the press or rightsholder for the specific license or written permission

### 12. Hugging Face: `Anv-ke/Maasai`

- Status: gated_access
- Action lane: request access and ethics review
- URL: `https://huggingface.co/datasets/Anv-ke/Maasai`
- Rights notes:
  - access requires sharing contact information before files can be viewed
  - the related African Next Voices organization card lists CC BY 4.0 and an explicit anti-surveillance / anti-exploitation warning
  - this is human voice data and needs voice-consent, privacy, and downstream-use review before any ingest
- Best next use:
  - request access, snapshot the access terms, review speaker-consent and handling constraints, and limit first use to approved ASR evaluation or tightly scoped speech experiments

### 13. Openverse / Freesound Maasai audio discovery lane

- Status: reference_only unless the specific upstream item is re-verified
- Action lane: discovery only, then upstream rights verification
- Discovery note:
  - Openverse is useful for finding openly licensed audio, but its own documentation says license accuracy must still be verified on the upstream source before use
- Selected upstream leads:
  - `Maasai Camp Nature Sounds Africa` - CC0 on Freesound - `https://freesound.org/people/selcukartut/sounds/504694/`
  - `Maasai Village Classroom` - CC0 on Freesound - `https://freesound.org/people/selcukartut/sounds/504693/`
  - `School Kids Counting Numbers` - CC0 on Freesound - `https://freesound.org/people/selcukartut/sounds/504675/`
  - `crickets` (Maasai Mara ambience) - CC0 on Freesound - `https://freesound.org/people/selcukartut/sounds/504882/`
- Rights / sensitivity notes:
  - nature ambience may be reusable for exhibits or demos, but it is not language training data
  - classroom or school recordings include student voices; even with CC0, they should stay out of automatic speech ingestion unless consent, context, and community appropriateness are documented
  - do not treat geotagged wildlife or village soundscapes as permission to bulk-collect neighboring community audio
- Best next use:
  - use ambience clips only for non-linguistic demo layers and keep school / classroom clips in `reference_only` until voice-consent review is complete

### 14. GitHub open-license language app lead: `ngesa254/Learn-Maasai`

- Status: reference_only
- Action lane: architecture and curriculum pattern review
- URL: `https://github.com/ngesa254/Learn-Maasai`
- Rights notes:
  - app code is Apache-2.0 licensed
  - repository visibility and code license do not automatically grant rights for every embedded media/data asset
  - treat this as a reusable app-pattern lead, not a blanket training-data source
- Best next use:
  - review mobile language-learning UX patterns, then inspect repository assets file-by-file before reusing any content in Maasai datasets

## Newly Reviewed On April 3, 2026

### 15. University of Iowa: Maasai Speech Samples

- Status: approved for speech-focused review and controlled ingestion
- Action lane: parse next
- URL: `https://iro.uiowa.edu/esploro/outputs/dataset/Maasai-Speech-Samples/9983557355602771`
- Rights notes:
  - open-access dataset page
  - CC BY 4.0
  - useful for speech, pronunciation, and lexicon support rather than broad conversational fluency by itself
- Best next use:
  - add it to the speech-evaluation lane, pronunciation validation, and lexicon cleanup before promoting any derived training rows

### 16. BibleNLP corpus

- Status: reference_only pending file-level rights filtering
- Action lane: manual review and selective ingest
- URL: `https://huggingface.co/datasets/bible-nlp/biblenlp-corpus`
- Rights notes:
  - the dataset card exposes mixed rights metadata rather than one blanket reuse status for every file
  - this makes it valuable, but not safe for blind bulk ingest
- Best next use:
  - inspect the Maa-specific files and only promote files whose individual rights basis is documented in the ingest manifest

### 17. Global Storybooks / Multilingual English Storybooks with Maa support

- Status: reference_only pending story-level license review
- Action lane: manual review and selective ingest
- URLs:
  - `https://globalstorybooks.net/`
  - `https://global-asp.github.io/storybooks-english/about/languages/`
  - `https://www.storybookscanada.globalstorybooks.net/about/source/`
- Rights notes:
  - the project is openly reusable overall, but reuse still needs attribution and story-level verification
  - Maa is present in the language inventory, which makes it a strong lead for simpler educational parallel text
- Best next use:
  - collect Maa story candidates one by one, record attribution, and use them as non-Bible fluency material

### 18. African Storybook

- Status: reference_only pending story-level license review
- Action lane: manual review and selective ingest
- URLs:
  - `https://africanstorybook.org/about.php`
  - `https://www.africanstorybook.org/terms.html`
- Rights notes:
  - the platform is openly licensed overall, but some stories carry additional non-commercial restrictions
  - that means ingestion must happen per story, not as a blanket crawl
- Best next use:
  - expand child-literacy and everyday-narrative Maa coverage once clearly reusable titles are isolated

## Recommended Run

```bash
python scripts/discover_vetted_maasai_sources.py summary
python scripts/discover_vetted_maasai_sources.py plan --output outputs/maasai_source_download_plan.json
python scripts/discover_maasai_media_intelligence.py --output data/registry/maasai_media_intelligence_candidates.json
```

## Near-Term Priorities

1. Extend the Hinde parser beyond the currently ingested high-confidence blocks.
2. Keep expanding Hollis conservatively beyond proverb-only coverage.
3. Request access to ANV for speech training and evaluation.
4. Contact UOregon before any dictionary/text ingestion.
5. Add University of Iowa speech samples to the speech-review lane.
6. Treat BibleNLP and storybook ecosystems as selective-ingest lanes until item-level rights are explicit.
7. Treat OHCHR, Wikimedia CC BY-SA, Frans Mol preview, and modern travel-guide materials as review/permission lanes until rights are explicit.
