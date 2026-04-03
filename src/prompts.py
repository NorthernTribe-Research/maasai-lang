"""
Prompt templates for English <-> Maasai translation instruction tuning.

These prompts are designed to be culturally aware and to preserve
Maasai terminology, clan references, and local dialect phrasing.
"""

from __future__ import annotations

from typing import Any

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

TRANSLATION_SYSTEM_PROMPT = (
    "You are an expert translator working between English and the Maasai language (Maa). "
    "Return only the translation. Preserve culturally significant Maa terms when a direct "
    "English substitute would flatten meaning."
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


def model_uses_chat_template(model_name_or_path: str | None) -> bool:
    """Return whether the model should be prompted through a native chat template."""
    name = str(model_name_or_path or "").strip().lower()
    return "gemma-4" in name


def apply_chat_template(
    formatter: Any,
    messages: list[dict[str, str]],
    *,
    add_generation_prompt: bool,
) -> str:
    """Render chat messages using a formatter that exposes apply_chat_template."""
    kwargs = {
        "tokenize": False,
        "add_generation_prompt": add_generation_prompt,
    }
    try:
        kwargs["enable_thinking"] = False
        return formatter.apply_chat_template(messages, **kwargs)
    except TypeError:
        kwargs.pop("enable_thinking", None)
        return formatter.apply_chat_template(messages, **kwargs)


def formatter_supports_chat_template(formatter: Any) -> bool:
    """Return whether a formatter exposes a usable chat template."""
    tokenizer = getattr(formatter, "tokenizer", formatter)
    return bool(getattr(tokenizer, "chat_template", None)) and hasattr(formatter, "apply_chat_template")


def build_chat_messages(
    user_prompt: str,
    *,
    assistant_response: str | None = None,
    system_prompt: str = TRANSLATION_SYSTEM_PROMPT,
) -> list[dict[str, str]]:
    """Build a simple system-user(-assistant) chat turn."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    if assistant_response is not None:
        messages.append({"role": "assistant", "content": assistant_response})
    return messages


def build_training_text(
    prompt: str,
    completion: str,
    *,
    model_name_or_path: str | None = None,
    formatter: Any | None = None,
) -> str:
    """Format a prompt+completion pair for causal LM training."""
    if (
        formatter is not None
        and model_uses_chat_template(model_name_or_path)
        and formatter_supports_chat_template(formatter)
    ):
        return apply_chat_template(
            formatter,
            build_chat_messages(prompt, assistant_response=completion),
            add_generation_prompt=False,
        )
    return f"{prompt}\n\n{RESPONSE_MARKER}\n{completion}"


def build_inference_prompt(
    direction: str,
    text: str,
    *,
    model_name_or_path: str | None = None,
    formatter: Any | None = None,
) -> str:
    """Build the inference prompt with response marker for generation."""
    if direction == "English → Maasai" or direction == "en_to_mas":
        prompt = EN_TO_MAS_PROMPT.format(source_text=text)
    elif direction == "Maasai → English" or direction == "mas_to_en":
        prompt = MAS_TO_EN_PROMPT.format(source_text=text)
    else:
        prompt = GENERIC_TRANSLATE_PROMPT.format(
            source_lang="unknown", target_lang="unknown", source_text=text
        )
    if (
        formatter is not None
        and model_uses_chat_template(model_name_or_path)
        and formatter_supports_chat_template(formatter)
    ):
        return apply_chat_template(
            formatter,
            build_chat_messages(prompt),
            add_generation_prompt=True,
        )
    return f"{prompt}\n\n{RESPONSE_MARKER}\n"


def build_generation_prompt_from_user_prompt(
    user_prompt: str,
    *,
    model_name_or_path: str | None = None,
    formatter: Any | None = None,
    system_prompt: str = TRANSLATION_SYSTEM_PROMPT,
) -> str:
    """Wrap an already-built user prompt for generation."""
    if (
        formatter is not None
        and model_uses_chat_template(model_name_or_path)
        and formatter_supports_chat_template(formatter)
    ):
        return apply_chat_template(
            formatter,
            build_chat_messages(user_prompt, system_prompt=system_prompt),
            add_generation_prompt=True,
        )
    return f"{user_prompt}\n\n{RESPONSE_MARKER}\n"


def extract_response(full_text: str) -> str:
    """Extract the model response from generated text."""
    if RESPONSE_MARKER in full_text:
        return full_text.split(RESPONSE_MARKER, 1)[1].strip()
    return full_text.strip()
