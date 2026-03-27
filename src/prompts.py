"""
Prompt templates for English <-> Maasai translation instruction tuning.

These prompts are designed to be culturally aware and to preserve
Maasai terminology, clan references, and local dialect phrasing.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Core translation prompts
# ---------------------------------------------------------------------------

EN_TO_MAS_PROMPT = (
    'Translate the following English sentence to Maasai:\n"{source_text}"'
)

MAS_TO_EN_PROMPT = (
    'Translate the following Maasai sentence to English:\n"{source_text}"'
)

GENERIC_TRANSLATE_PROMPT = (
    'Translate from {source_lang} to {target_lang}:\n"{source_text}"'
)

# ---------------------------------------------------------------------------
# Cultural context prompts (for enriched instruction tuning)
# ---------------------------------------------------------------------------

CULTURAL_CONTEXT_EN_TO_MAS = (
    "You are a knowledgeable translator of the Maasai language (Maa). "
    "The Maasai people (Ilmaasai) are a Nilotic ethnic group in East Africa. "
    "Preserve culturally significant terms such as enkang (homestead), "
    "enkaji (house), olaiguenani (spokesperson), oloiboni (spiritual leader), "
    "and age-set names. Use natural local dialect phrasing.\n\n"
    'Translate the following English sentence to Maasai:\n"{source_text}"'
)

CULTURAL_CONTEXT_MAS_TO_EN = (
    "You are a knowledgeable translator of the Maasai language (Maa). "
    "When translating Maasai to English, retain culturally important terms "
    "in parentheses where they carry meaning that English approximation would flatten. "
    "For example: oloiboni (ritual leader), enkang (homestead compound), "
    "e-unoto (warrior graduation ceremony).\n\n"
    'Translate the following Maasai sentence to English:\n"{source_text}"'
)

# ---------------------------------------------------------------------------
# Sub-tribe awareness prompts
# ---------------------------------------------------------------------------

SUBTRIBE_CONTEXT_PROMPT = (
    "The Maasai nation consists of multiple sections (iloshon) including: "
    "Ilkisongo, Ilpurko, Iloitai, Ildamat, Ilkeekonyokie, Iloodokilani, "
    "Ilkaputiei, Ilmatapato, Laikipiak, Ilwuasinkishu, Isiria, Ilmoitanik, "
    "Ildalalekutuk, Ilaitayiok, Ilarusa, Ilparakuyo, Samburu (Lmomonyot), "
    "Ldikiri, and others. Each section may have slight dialect variations. "
    "When translating, use the most commonly understood Maa phrasing unless "
    "a specific section dialect is indicated.\n\n"
    'Translate the following {direction}:\n"{source_text}"'
)


# ---------------------------------------------------------------------------
# Response formatting
# ---------------------------------------------------------------------------
RESPONSE_MARKER = "### Response:"

def build_training_text(prompt: str, completion: str) -> str:
    """Format a prompt+completion pair for causal LM training."""
    return f"{prompt}\n\n{RESPONSE_MARKER}\n{completion}"


def build_inference_prompt(direction: str, text: str) -> str:
    """Build the inference prompt with response marker for generation."""
    if direction == "English → Maasai" or direction == "en_to_mas":
        prompt = EN_TO_MAS_PROMPT.format(source_text=text)
    elif direction == "Maasai → English" or direction == "mas_to_en":
        prompt = MAS_TO_EN_PROMPT.format(source_text=text)
    else:
        prompt = GENERIC_TRANSLATE_PROMPT.format(
            source_lang="unknown", target_lang="unknown", source_text=text
        )
    return f"{prompt}\n\n{RESPONSE_MARKER}\n"


def extract_response(full_text: str) -> str:
    """Extract the model response from generated text."""
    if RESPONSE_MARKER in full_text:
        return full_text.split(RESPONSE_MARKER, 1)[1].strip()
    return full_text.strip()
