"""
Maasai Language Showcase — Advanced Space Application

A culturally-themed Gradio interface with:
1. Translation (English ↔ Maasai)
2. Speech Transcription (Maasai ASR via Paza)
3. Nkatini & Oyete (Folk Stories & Riddles)
4. Maasai Culture Explorer
5. Laikipiak History (complete bilingual documentation)
6. About / Glossary

Design: Dark theme with Maasai beadwork colors
"""

from __future__ import annotations

import os
import json
import logging
import re
from html import escape
from pathlib import Path
from typing import Any

import gradio as gr

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TRANSLATION_MODEL_ID = os.getenv("TRANSLATION_MODEL_ID", "NorthernTribe-Research/maasai-en-mt")
ASR_MODEL_ID = os.getenv("ASR_MODEL_ID", "microsoft/paza-whisper-large-v3-turbo")
APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR if (APP_DIR / "data").exists() else APP_DIR.parent
CSS_PATH = APP_DIR / "style.css"
GLOSSARY_PATH = PROJECT_ROOT / "data" / "glossary" / "maasai_glossary.json"
EXAMPLES_PATH = APP_DIR / "examples" / "sample_prompts.json"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("maasai-space")


# ---------------------------------------------------------------------------
# Model Loading (lazy)
# ---------------------------------------------------------------------------
_translation_pipeline = None
_asr_pipeline = None
_translation_error: str | None = None
_asr_error: str | None = None
_glossary_cache: list[dict[str, Any]] | None = None
_sample_prompts_cache: list[list[str]] | None = None


def get_translation_pipeline():
    """Lazy-load translation model."""
    global _translation_pipeline, _translation_error
    if _translation_pipeline is None:
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch

            tokenizer = AutoTokenizer.from_pretrained(TRANSLATION_MODEL_ID, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(
                TRANSLATION_MODEL_ID,
                torch_dtype=torch.float16,
                device_map="auto",
                trust_remote_code=True,
            )
            _translation_pipeline = (model, tokenizer)
            _translation_error = None
            logger.info("Translation model loaded: %s", TRANSLATION_MODEL_ID)
        except Exception as e:
            logger.warning("Translation model not available: %s", e)
            _translation_error = str(e)
            _translation_pipeline = None
    return _translation_pipeline


def get_asr_pipeline():
    """Lazy-load ASR model."""
    global _asr_pipeline, _asr_error
    if _asr_pipeline is None:
        try:
            import torch
            from transformers import pipeline as hf_pipeline

            _asr_pipeline = hf_pipeline(
                "automatic-speech-recognition",
                model=ASR_MODEL_ID,
                torch_dtype=torch.float16,
                device_map="auto",
            )
            logger.info("ASR model loaded: %s", ASR_MODEL_ID)
            _asr_error = None
        except Exception as e:
            logger.warning("ASR model not available: %s", e)
            _asr_error = str(e)
            _asr_pipeline = None
    return _asr_pipeline


# ---------------------------------------------------------------------------
# Translation Functions
# ---------------------------------------------------------------------------
def load_glossary_data() -> list[dict[str, Any]]:
    """Load glossary entries from JSON file."""
    global _glossary_cache
    if _glossary_cache is not None:
        return _glossary_cache
    try:
        with open(GLOSSARY_PATH, encoding="utf-8") as f:
            _glossary_cache = json.load(f)
    except Exception as e:
        logger.warning("Failed to load glossary: %s", e)
        _glossary_cache = []
    return _glossary_cache


def load_sample_prompts() -> list[list[str]]:
    """Load curated example prompts for the translation tab."""
    global _sample_prompts_cache
    if _sample_prompts_cache is not None:
        return _sample_prompts_cache

    fallback_examples = [
        ["Hello, how are you?", "English → Maasai"],
        ["Where are the cattle?", "English → Maasai"],
        ["God has blessed us with rain.", "English → Maasai"],
        ["Supa, ipa eata?", "Maasai → English"],
        ["Ashe oleng.", "Maasai → English"],
    ]

    try:
        raw_examples = json.loads(EXAMPLES_PATH.read_text(encoding="utf-8"))
        _sample_prompts_cache = [
            [item.get("text", "").strip(), item.get("direction", "English → Maasai")]
            for item in raw_examples
            if item.get("text")
        ]
    except Exception as e:
        logger.warning("Failed to load sample prompts: %s", e)
        _sample_prompts_cache = fallback_examples

    return _sample_prompts_cache or fallback_examples


def get_glossary_domain_choices() -> list[str]:
    """Build glossary domain filters from the glossary file itself."""
    domains = sorted(
        {
            str(entry.get("domain", "other")).strip()
            for entry in load_glossary_data()
            if str(entry.get("domain", "")).strip()
        }
    )
    return ["all", *domains] if domains else ["all"]


def get_model_status() -> dict:
    """Return translation model runtime status without forcing a load."""
    if _translation_pipeline is not None:
        state = "loaded"
        label = "Loaded in memory"
        detail = "Live translation is using the configured Hugging Face model."
    elif _translation_error:
        state = "unavailable"
        label = "Demo fallback"
        detail = "Model loading failed; the app will serve demo translations until a valid model is available."
    else:
        state = "lazy"
        label = "Loads on demand"
        detail = "The model will only load when a translation request is made."

    return {
        "loaded": _translation_pipeline is not None,
        "model_id": TRANSLATION_MODEL_ID,
        "mode": state,
        "label": label,
        "detail": detail,
        "error": _translation_error,
    }


def get_asr_status() -> dict:
    """Return ASR runtime status without forcing a load."""
    if _asr_pipeline is not None:
        state = "loaded"
        label = "Loaded in memory"
        detail = "Speech transcription is running with the configured ASR model."
    elif _asr_error:
        state = "unavailable"
        label = "Unavailable"
        detail = "ASR model loading failed; audio actions will stay in fallback mode."
    else:
        state = "lazy"
        label = "Loads on demand"
        detail = "The ASR model will only load when an audio request is made."

    return {
        "loaded": _asr_pipeline is not None,
        "model_id": ASR_MODEL_ID,
        "mode": state,
        "label": label,
        "detail": detail,
        "error": _asr_error,
    }


def render_runtime_status() -> str:
    """Render current runtime state for the primary Space workflows."""
    translation = get_model_status()
    speech = get_asr_status()

    def render_card(title: str, status: dict[str, Any]) -> str:
        return f"""
        <div class="status-card is-{escape(str(status['mode']))}">
            <div class="status-kicker">{escape(title)}</div>
            <div class="status-head">{escape(str(status['label']))}</div>
            <p class="status-detail">{escape(str(status['detail']))}</p>
            <p class="status-meta"><strong>Repo:</strong> <code>{escape(str(status['model_id']))}</code></p>
        </div>
        """

    return f"""
    <div class="status-grid">
        {render_card("Translation", translation)}
        {render_card("Speech", speech)}
    </div>
    """


def glossary_candidates(entry: dict[str, Any], direction: str) -> list[str]:
    """Return candidate search terms for the given translation direction."""
    primary_key = "term_english" if direction == "English → Maasai" else "term_maasai"
    secondary_key = "term_maasai" if direction == "English → Maasai" else "term_english"
    return [
        str(entry.get(primary_key, "")).strip(),
        *[str(item).strip() for item in entry.get("alternate_spellings", [])],
        str(entry.get(secondary_key, "")).strip(),
    ]


def term_mentioned(text: str, term: str) -> bool:
    """Check whether a glossary term appears in the input text."""
    term = term.strip()
    if not term:
        return False
    pattern = re.compile(rf"(?<!\w){re.escape(term.lower())}(?!\w)")
    return bool(pattern.search(text.lower()))


def find_glossary_matches(text: str, direction: str, limit: int = 6) -> list[dict[str, Any]]:
    """Find glossary entries that are directly referenced by the input text."""
    matches: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for entry in load_glossary_data():
        for candidate in glossary_candidates(entry, direction):
            if not term_mentioned(text, candidate):
                continue

            key = (
                str(entry.get("term_maasai", "")).strip(),
                str(entry.get("term_english", "")).strip(),
            )
            if key in seen:
                break

            seen.add(key)
            matches.append(
                {
                    "entry": entry,
                    "matched_on": candidate,
                }
            )
            break

    matches.sort(
        key=lambda item: (
            not bool(item["entry"].get("preserve")),
            -len(str(item["matched_on"])),
            str(item["entry"].get("domain", "")),
        )
    )
    return matches[:limit]


def build_inference_prompt(text: str, direction: str, glossary_matches: list[dict[str, Any]]) -> str:
    """Build a translation prompt with glossary guidance when matches are present."""
    if direction == "English → Maasai":
        header = (
            "You are an expert English-to-Maasai translator. Translate the English text into natural "
            "Maa. Preserve cultural terms faithfully and do not flatten protected terminology."
        )
        input_label = "English"
        output_label = "Maasai"
    else:
        header = (
            "You are an expert Maasai-to-English translator. Translate the Maa text into clear English "
            "while preserving important cultural meaning and named terms where appropriate."
        )
        input_label = "Maasai"
        output_label = "English"

    glossary_section = ""
    if glossary_matches:
        guidance_lines = []
        for item in glossary_matches:
            entry = item["entry"]
            guidance_lines.append(
                f"- {entry.get('term_english', '')} ↔ {entry.get('term_maasai', '')} "
                f"[domain: {entry.get('domain', 'general')}]"
            )
        glossary_section = (
            "\n\nGlossary guidance:\n"
            + "\n".join(guidance_lines)
            + "\nUse these mappings faithfully. Preserve protected Maa terms exactly when appropriate."
        )

    return f"{header}{glossary_section}\n\n{input_label}: {text}\n{output_label}:"


def render_glossary_matches(glossary_matches: list[dict[str, Any]], direction: str) -> str:
    """Render matched glossary entries for the UI."""
    if not glossary_matches:
        return (
            "### Glossary Support\n"
            "No protected glossary terms were detected in this text. Translation will proceed without extra hints."
        )

    lines = [
        "### Glossary Support",
        "These entries were detected and added as guidance for this translation:",
        "",
    ]
    for item in glossary_matches:
        entry = item["entry"]
        if direction == "English → Maasai":
            source_term = entry.get("term_english", "")
            target_term = entry.get("term_maasai", "")
        else:
            source_term = entry.get("term_maasai", "")
            target_term = entry.get("term_english", "")

        preserve_note = " · protected" if entry.get("preserve") else ""
        lines.append(
            f"- `{source_term}` -> `{target_term}` ({entry.get('domain', 'general')}{preserve_note})"
        )

    return "\n".join(lines)


def render_voice_panel(text: str, direction: str) -> str:
    """Render a browser-side speech panel for translated output."""
    text = text.strip()
    if not text or text.startswith("⚠️") or text.startswith("🔗"):
        return """
        <div class="voice-panel is-empty">
            <div class="voice-heading">Voice</div>
            <p class="voice-note">Translate text first to enable browser playback.</p>
        </div>
        """

    if direction == "English → Maasai":
        target_lang = "sw-KE"
        heading = "Hear Maa Translation"
        note = (
            "Browser speech is used here. Most devices do not expose a dedicated Maa voice, "
            "so the app requests Kenyan Swahili as the closest regional fallback when reading Maa aloud."
        )
        voice_preferences = ["sw-KE", "sw", "en-KE", "en-US"]
    else:
        target_lang = "en-US"
        heading = "Hear English Translation"
        note = "Playback uses the browser's available English voice."
        voice_preferences = ["en-KE", "en-US", "en-GB"]

    safe_text = json.dumps(text)
    safe_lang = json.dumps(target_lang)
    safe_preferences = json.dumps(voice_preferences)

    return f"""
    <div class="voice-panel">
        <div class="voice-heading">{heading}</div>
        <div class="voice-actions">
            <button
                class="voice-button"
                onclick='(function() {{
                    if (!("speechSynthesis" in window)) {{
                        return;
                    }}
                    const text = {safe_text};
                    const lang = {safe_lang};
                    const preferences = {safe_preferences};
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = lang;
                    utterance.rate = 0.92;
                    utterance.pitch = 1.0;
                    const voices = window.speechSynthesis.getVoices();
                    const selected = voices.find((voice) =>
                        preferences.some((prefix) =>
                            voice.lang && voice.lang.toLowerCase().startsWith(prefix.toLowerCase())
                        )
                    );
                    if (selected) {{
                        utterance.voice = selected;
                    }}
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                }})()'
            >
                ▶ Hear Audio
            </button>
            <button
                class="voice-button secondary"
                onclick='if ("speechSynthesis" in window) {{ window.speechSynthesis.cancel(); }}'
            >
                ■ Stop
            </button>
        </div>
        <p class="voice-note">{note}</p>
    </div>
    """


def translate_text(
    text: str,
    direction: str,
    glossary_matches: list[dict[str, Any]] | None = None,
) -> str:
    """Translate text between English and Maasai."""
    if not text.strip():
        return "⚠️ Please enter text to translate."

    glossary_matches = glossary_matches or find_glossary_matches(text, direction)

    pipeline = get_translation_pipeline()
    if pipeline is None:
        # Fallback demo response
        return _demo_translate(text, direction)

    model, tokenizer = pipeline

    prompt = build_inference_prompt(text, direction, glossary_matches)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.3, do_sample=True)
    result = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
    return result.strip()


def translate_with_context(text: str, direction: str) -> tuple[str, str, str, str]:
    """Translate text and return glossary guidance plus runtime state."""
    if not text.strip():
        return (
            "⚠️ Please enter text to translate.",
            "### Glossary Support\nEnter text to surface protected-term guidance.",
            render_runtime_status(),
            render_voice_panel("", direction),
        )

    glossary_matches = find_glossary_matches(text, direction)
    translation = translate_text(text, direction, glossary_matches=glossary_matches)
    return (
        translation,
        render_glossary_matches(glossary_matches, direction),
        render_runtime_status(),
        render_voice_panel(translation, direction),
    )


def _demo_translate(text: str, direction: str) -> str:
    """Demo translations when model is not loaded."""
    demo_en_to_mas = {
        "hello": "Supa",
        "hello, how are you?": "Supa, ipa eata?",
        "thank you": "Ashe",
        "thank you very much": "Ashe oleng",
        "where are the cattle?": "Kai inkishu?",
        "the children are going to school": "Inkera ia enkisoma",
        "god has blessed us with rain": "Enkai eaku olchani",
        "good morning": "Supat enkolooŋ",
        "peace be with you": "Osilalei eng'eno",
        "this land is important": "Enkop nee ake aidim",
        "water": "Enkare",
        "cattle": "Inkishu",
        "mountain": "Ol-doinyo",
        "god": "Enkai",
        "warrior": "Olmurrani",
        "elder": "Olpayian",
        "house": "Enkaji",
        "tell me a story": "Idaŋat nkatini",
        "tell me a riddle": "Idaŋat oyete",
    }
    demo_mas_to_en = {v.lower(): k.title() for k, v in demo_en_to_mas.items()}

    text_lower = text.lower().strip().rstrip(".")

    if direction == "English → Maasai":
        result = demo_en_to_mas.get(text_lower)
        if result:
            return f"{result}\n\n💡 *Demo mode — connect a fine-tuned model for full translation*"
        return (
            f"🔗 Model not loaded. In production, '{text}' would be translated to Maasai using the "
            f"fine-tuned Gemma model.\n\n"
            f"💡 *Deploy with a fine-tuned model for accurate translations.*"
        )
    else:
        result = demo_mas_to_en.get(text_lower)
        if result:
            return f"{result}\n\n💡 *Demo mode — connect a fine-tuned model for full translation*"
        return (
            f"🔗 Model not loaded. In production, '{text}' would be translated to English.\n\n"
            f"💡 *Deploy with a fine-tuned model for accurate translations.*"
        )


# ---------------------------------------------------------------------------
# ASR Function
# ---------------------------------------------------------------------------
def transcribe_audio(audio_path: str) -> str:
    """Transcribe Maasai speech to text."""
    if audio_path is None:
        return "⚠️ Please upload or record audio."

    asr = get_asr_pipeline()
    if asr is None:
        return (
            "🔗 ASR model not loaded. In production, this would transcribe Maasai speech using "
            f"Microsoft Paza ({ASR_MODEL_ID}).\n\n"
            "💡 *Deploy with the ASR model for speech transcription.*"
        )

    result = asr(audio_path)
    return result.get("text", "No transcription available.")


def transcribe_and_translate(audio_path: str) -> tuple[str, str]:
    """Transcribe and then translate."""
    transcription = transcribe_audio(audio_path)
    if transcription.startswith("⚠️") or transcription.startswith("🔗"):
        return transcription, ""
    translation = translate_text(transcription, "Maasai → English")
    return transcription, translation


def transcribe_audio_with_status(audio_path: str) -> tuple[str, str]:
    """Transcribe audio and return updated runtime status."""
    return transcribe_audio(audio_path), render_runtime_status()


def transcribe_and_translate_with_status(audio_path: str) -> tuple[str, str, str]:
    """Transcribe audio, translate it, and return updated runtime status."""
    transcription, translation = transcribe_and_translate(audio_path)
    return transcription, translation, render_runtime_status()


def search_glossary(query: str, domain_filter: str = "all") -> str:
    """Search glossary entries and return formatted results."""
    glossary = load_glossary_data()
    query = query.strip()
    query_lower = query.lower()
    results = []

    for entry in glossary:
        if domain_filter != "all" and entry.get("domain") != domain_filter:
            continue

        if query_lower:
            match = (
                query_lower in entry.get("term_maasai", "").lower()
                or query_lower in entry.get("term_english", "").lower()
                or query_lower in entry.get("notes", "").lower()
                or any(query_lower in alt.lower() for alt in entry.get("alternate_spellings", []))
            )
            if not match:
                continue

        results.append(entry)

    if not results:
        if query_lower:
            return f"❌ No results found for '{query}'."
        return "### Glossary Overview\nChoose a domain or type a term to explore the glossary."

    if not query_lower:
        results = sorted(
            results,
            key=lambda entry: (
                not bool(entry.get("preserve")),
                str(entry.get("domain", "")),
                str(entry.get("term_english", "")),
            ),
        )
        preview_count = min(len(results), 12)
        header = "### Glossary Overview\n\n"
        if domain_filter == "all":
            header += "Showing a curated preview of protected and high-signal terms across the glossary.\n\n"
        else:
            header += f"Showing terms in the **{domain_filter}** domain.\n\n"
        if len(results) > preview_count:
            header += f"_Showing {preview_count} of {len(results)} terms._\n\n"
        results = results[:preview_count]
    else:
        header = f"### Search Results for '{query}'\n\n"

    # Format results as markdown
    output = header
    for i, entry in enumerate(results, 1):
        preserve_badge = "🔒 Protected" if entry.get("preserve") else ""
        output += f"""
**{i}. {entry.get('term_maasai', '')}** — *{entry.get('term_english', '')}*  
Domain: *{entry.get('domain', 'N/A')}* {preserve_badge}  
Notes: {entry.get('notes', 'N/A')}  
Alternates: {', '.join(entry.get('alternate_spellings', []))}  

---
"""

    return output




NKATINI_STORIES = {
    "🦁 How Enkai Gave Cattle to the Maasai": {
        "en": (
            "In the beginning, Enkai (God) lived on Earth together with the people. Enkai owned all the cattle "
            "in the world. When the time came for Enkai to ascend to the sky, Enkai decided to entrust the "
            "cattle to the Maasai people.\n\n"
            "Enkai gathered all the cattle and sent them sliding down from heaven along the roots of a great "
            "wild fig tree. The cattle tumbled down from the sky, one by one, into the waiting arms of the "
            "Maasai.\n\n"
            "As the cattle descended, some people from other nations tried to take them, but the Maasai "
            "stood firm and received the cattle as Enkai intended.\n\n"
            "This is why the Maasai believe that all cattle in the world rightfully belong to them — they "
            "were given as a sacred gift from Enkai Narok (the benevolent Black God). To this day, the "
            "Maasai say: **'Meishoo iyiook enkai inkishu o-inkujit'** — God gave us cattle and grass."
        ),
        "mas": (
            "Taata, Enkai eidurru enkop nabo iltung'anak. Enkai ake nanyore inkishu oleng en enkop. "
            "Netii Enkai eitu enkop, Enkai eidim inkishu Ilmaasai.\n\n"
            "Enkai eidurru inkishu oleng ne eaku oreteti kitok. Inkishu eitu en kewarie, nabo ne nabo, "
            "ne Ilmaasai eidim.\n\n"
            "Netii inkishu eitu, iltung'anak en oloshon ake ikilikuano inkishu, kake Ilmaasai eidim "
            "ne kitoŋ inkishu ne Enkai eidim.\n\n"
            "Nee ake Ilmaasai eidim inkishu oleng en enkop — Enkai Narok eidim nanyore. "
            "Ilmaasai eidaŋat: **'Meishoo iyiook enkai inkishu o-inkujit'** — Enkai eaku inkishu nabo esiaai."
        ),
    },
    "⚔️ The Lion and the Warrior": {
        "en": (
            "There was once a young olmurrani (warrior) who was sent to prove his bravery. The elders "
            "told him: 'Go into the bush and face the lion. Do not run. The lion will see your courage "
            "and know that you are Maasai.'\n\n"
            "The young warrior took his spear and his shield painted with the markings of his age-set. "
            "He walked into the tall grass where the great lion waited.\n\n"
            "When the lion charged, the warrior stood his ground. He planted his feet like the roots of "
            "an oreteti (tree) and raised his spear. The lion leaped, and the warrior struck true.\n\n"
            "When he returned to the enkang, the elders received him with the blessing: 'Meishoo Enkai' "
            "(God bless you). His mother shaved his warrior hair as part of the eunoto ceremony.\n\n"
            "**Enaitoti (Moral):** Bravery is not the absence of fear, but the strength to face what must be faced."
        ),
        "mas": (
            "Eton olmurrani naata netii emuratta. Ilpayiani eidaŋat: 'Ilo en oreteti ne itu olowuaru-kitok. "
            "Meeta tenebo olalem. Olowuaru-kitok eidim ne eidim Olmaasai.'\n\n"
            "Olmurrani eidim olmo nabo engarna en olporror. Eitu en esiaai kitok ne olowuaru-kitok eidim.\n\n"
            "Netii olowuaru-kitok eitu, olmurrani eidim. Eidim enyeŋ ne oreteti ne eidim olmo. "
            "Olowuaru-kitok eitu ne olmurrani eidim.\n\n"
            "Netii eitu enkang, ilpayiani eidim olelem: 'Meishoo Enkai.' "
            "Yeyo eidim enkoitoi en eunoto.\n\n"
            "**Enaitoti:** Eidim meeta eitoliki, kake eidim pee itu ne ikilikuano."
        ),
    },
    "🌟 The Origin of the Stars": {
        "en": (
            "When Enkai created the world, the sky was completely dark at night. The Maasai could not "
            "see their cattle, and the predators hunted freely in the darkness.\n\n"
            "A mother prayed to Enkai: 'Give us light in the night so we can protect our children "
            "and our cattle.'\n\n"
            "Enkai was moved by her prayer. Enkai took the sparks from the mother's cooking fire "
            "and threw them into the sky. Each spark became a star. The brightest stars were the "
            "sparks that burned the hottest — they became the guiding stars that the Maasai use for "
            "navigation.\n\n"
            "The Milky Way was the trail of sparks that scattered across the sky. 'These are your "
            "fires,' said Enkai. 'I have carried your hearth into the heavens so that you will never "
            "be in darkness.'\n\n"
            "**Enaitoti:** The prayers of a mother have the power to reach Enkai. Light always comes to those who ask."
        ),
        "mas": (
            "Netii Enkai eidim enkop, kewarie ake narok oleng. Ilmaasai meinyoo inkishu, ne ilowuarak "
            "ia en narok.\n\n"
            "Yeyo eidol Enkai: 'Inion eiyie enkolooŋ en ewarie pee kitoŋ inkera nabo inkishu.'\n\n"
            "Enkai eidim le yeyo. Enkai eidim ilorien en enkiok en yeyo ne eitu en kewarie. "
            "Ilorien nabo ake oloonito nabo. Iloonito kitok ake ilorien naidim — ake iloonito "
            "ne Ilmaasai ia.\n\n"
            "Enkewarie ake embolet en ilorien en kewarie. 'Nee ake enkiok lino,' Enkai eidaŋat. "
            "'Aidim enkiok lino en kewarie pee meeta narok.'\n\n"
            "**Enaitoti:** Enkidol en yeyo eidim Enkai. Enkolooŋ eaku pee eidol."
        ),
    },
    "👩 The Woman Who Saved the Enkang": {
        "en": (
            "There was a time when a drought came so severe that the rivers dried and the grass "
            "withered. The cattle began to die, one by one. The men of the enkang sat in despair.\n\n"
            "But one woman — a mother of five children — remembered a story her grandmother had told "
            "her about a hidden spring beneath a great acacia tree on the far side of the olkeri.\n\n"
            "Without telling the men, she took her calabash and walked three days through the scorching "
            "heat. She found the spring exactly where her grandmother had said.\n\n"
            "She filled her calabash and returned to guide the whole enkang to the water. The cattle "
            "were saved.\n\n"
            "The elders praised her: 'Enkai speaks through the wisdom of women.'\n\n"
            "**Enaitoti:** Women are the keepers of vital knowledge. Their wisdom saves lives."
        ),
        "mas": (
            "Eton taata netii olameyu eaku kitok oleng ne enkolong eidim ne esiaai eidim. "
            "Inkishu eitu, nabo ne nabo. Iltung'anak en enkang eidurru.\n\n"
            "Kake yeyo nabo — yeyo en inkera imiet — eidim nkatini en koko le enkare "
            "en oreteti kitok en olkeri.\n\n"
            "Meeta eidaŋat iltung'anak, eidim olmusei ne eitu okuni en enkolooŋ naidim. "
            "Eidim enkare ne koko eidaŋat.\n\n"
            "Eidim olmusei ne eitu ne eidim enkang oleng le enkare. Inkishu eidim.\n\n"
            "Ilpayiani eidim: 'Enkai eidaŋat en enkoitoi en intoyie.'\n\n"
            "**Enaitoti:** Intoyie ake nanyore en enkoitoi. Enkoitoi en intoyie ake enkishui."
        ),
    },
    "📱 The Warrior with a Phone (Modern)": {
        "en": (
            "Lemayian was an olmurrani who herded cattle in the Maasai Mara. One day, a tourist left "
            "behind a smartphone. Lemayian was curious.\n\n"
            "A teacher showed him how it worked. Lemayian discovered he could check weather forecasts — "
            "knowing when the rains would come days in advance.\n\n"
            "He set up a WhatsApp group for his age-set. Warriors across three different enkang'itie "
            "could now warn each other about predators, share grazing information, and coordinate "
            "cattle movements.\n\n"
            "'This is like the old signaling system,' Lemayian told the elders, 'but faster.'\n\n"
            "He also used the phone to record the elder's stories and songs. 'If I can record Koko's "
            "voice telling nkatini, then her stories will never be lost, even when she joins the ancestors.'\n\n"
            "**Enaitoti:** Technology can serve traditional values when used wisely."
        ),
        "mas": (
            "Lemayian ake olmurrani netii inkishu en Ilmaasai Mara. Taata nabo, olee en olkeju "
            "eidim simu. Lemayian ikilikuano.\n\n"
            "Oltiankali eidaŋat ne eidim. Lemayian eidim ne eidim olchani — eidim netii olchani "
            "eaku taata en taata.\n\n"
            "Eidim olporror en simu. Ilmurran en enkang okuni eidim ne eidaŋat ilowuarak, "
            "ne eidaŋat esiaai, ne eidim inkishu.\n\n"
            "'Nee ake enyamal en kuna,' Lemayian eidaŋat ilpayiani, 'kake eidim oleng.'\n\n"
            "Eidim simu ne eidim nkatini nabo olalem en ilpayiani. 'Aidim enkutuk en Koko "
            "en nkatini, ne nkatini meibore, netii Koko eitu iloshon.'\n\n"
            "**Enaitoti:** Enyamal en taata eidim oloshon en kuna netii eidim sidai."
        ),
    },
    "🌍 The Bead Maker's Daughter Goes Online (Modern)": {
        "en": (
            "Naipanoi learned beadwork from her mother, who learned from her mother, going back "
            "generations. The intricate patterns — red for bravery, blue for the sky, green for the "
            "land — told stories no outsider could read.\n\n"
            "But the young people were losing interest. 'Why should I make beads? I can buy a necklace from Nairobi.'\n\n"
            "Naipanoi created an Instagram account showcasing her beadwork. She photographed each piece "
            "and wrote the story behind the pattern.\n\n"
            "Orders came from Nairobi, Europe, America. Other women joined. The income helped families.\n\n"
            "More importantly, the young girls who had ignored beadwork now wanted to learn — they saw "
            "that their tradition had value in the modern world.\n\n"
            "Her mother said: 'The patterns were always valuable. The world just needed to see them.'\n\n"
            "**Enaitoti:** Culture does not have to be frozen in the past — it can thrive in new forms."
        ),
        "mas": (
            "Naipanoi eidim osinka en yeyo, ne yeyo eidim en yeyo, en taata oleng. "
            "Osinka — nanyokie en eidim, naibulu en kewarie, naidim en enkop — eidaŋat nkatini.\n\n"
            "Kake inkera en taata meikilikuano. 'Kai aidim osinka? Aidim olkejuado en Nairobi.'\n\n"
            "Naipanoi eidim simu ne osinka. Eidim osinka nabo ne eidaŋat nkatini en osinka.\n\n"
            "Iltung'anak eitu Nairobi, Europa, Amerika. Intoyie ake eidurru. Nanyore eidim.\n\n"
            "Intoyie naata meikilikuano osinka ikilikuano eidim — eidim ne oloshon eidim en taata.\n\n"
            "Yeyo eidaŋat: 'Osinka ake nanyore taata oleng. Enkop ikilikuano pee eidim.'\n\n"
            "**Enaitoti:** Oloshon meeta en kuna nabo — eidim en taata."
        ),
    },
}

OYETE_RIDDLES = [
    {
        "riddle_mas": "Eeta nini neme eton, kake meibelekeny?",
        "riddle_en": "What has legs but cannot walk?",
        "answer": "Enkaji (A house) — it stands on wooden poles but cannot move.",
    },
    {
        "riddle_mas": "Eeta nini naata nabo, kake eidim iloshon oleng?",
        "riddle_en": "What is one thing that can reach many sections?",
        "answer": "Enkutuk (A word / language) — one word can travel across all iloshon.",
    },
    {
        "riddle_mas": "Eidim pee ewuo ne meiruk pee euu?",
        "riddle_en": "What can go out but cannot come back?",
        "answer": "Enkutuk (A spoken word) — once spoken, it cannot be taken back.",
    },
    {
        "riddle_mas": "Eeta nini neaku enkolooŋ ne meiruk ewarie?",
        "riddle_en": "What comes in the morning but does not return at night?",
        "answer": "Olari (Shadow) — it appears with the sun but vanishes in darkness.",
    },
    {
        "riddle_mas": "Eeta nini naidim oleng kake me-inyoo?",
        "riddle_en": "What is very tall but has no legs?",
        "answer": "Oreteti (A tree) — it reaches for the sky but is rooted in the earth.",
    },
    {
        "riddle_mas": "Nini ake naibor ewarie kake narok enkolooŋ?",
        "riddle_en": "What is white at night but black in the morning?",
        "answer": "Enkiok (Fire embers) — glowing white-hot at night, cold black ash by morning.",
    },
    {
        "riddle_mas": "Eeta nini nenoŋ olchani kake menoŋ olameyu?",
        "riddle_en": "What cries with the rain but is silent in drought?",
        "answer": "Enkolong (The river) — it flows with rain but dries in drought.",
    },
    {
        "riddle_mas": "Eeta nini neitu oleng kake meinyoo enkonyek?",
        "riddle_en": "What sees everything but has no eyes?",
        "answer": "Enkai (God) — sees all but is not seen.",
    },
]


# ============================================================================
# LAIKIPIAK COMPLETE DOCUMENTATION
# ============================================================================
LAIKIPIAK_DOC = """
# 🛡️ The Laikipiak — Ilmaasai le Laikipia

## History — Olesere en Laikipiak

The Laikipiak (also written Il-Laikipiak, Laikipia Maasai) were once the most powerful and 
feared of all Maasai sections. Their name is immortalized in the Laikipia Plateau of central 
Kenya — a vast highland region of rich grasslands and abundant water that was once their domain.

**Laikipiak ake olosho kitok oleng en Ilmaasai oleng. Enkaraki en Laikipia ake en enkop kitok 
en Kenya — esiaai sidai nabo enkare oleng netii enkop eiyie.**

---

### Origins — Enyamal

The Laikipiak were a section (olosho) of the broader Maasai nation, bound by the same language 
(Maa), age-set system (ilporror), cattle-centered culture, and reverence for Enkai. They 
occupied the Laikipia Plateau — roughly the area between Mount Kenya to the east, the Aberdare 
Range to the south, and the Great Rift Valley to the west.

**Laikipiak ake olosho en Ilmaasai, eidurru enkutuk oo lMaa nabo, olporror nabo, inkishu 
nabo, nabo Enkai. Eidurru enkop en Laikipia — en Ol Doinyo Kenya ne esoit en Aberdare ne 
Oldaraki Kitok.**

Their territory was among the richest in all of Maasailand. The plateau sits at 1,800–2,500 
meters elevation, with reliable rainfall and lush grasslands — perfect for cattle. This wealth 
made the Laikipiak powerful but also a target.

**Enkop en Laikipiak ake nanyore oleng en Ilmaasai oleng. Esiaai sidai nabo olchani — inkishu 
eidim sidai. Nanyore nee eidim Laikipiak eidim, kake ake nee eidim oleng.**

---

### The Rise of the Laikipiak — Eidim en Laikipiak

During the 18th and early 19th centuries, the Laikipiak rose to become the dominant Maasai 
section. Their warriors (ilmurran) were numerous, well-organized, and battle-hardened. They 
controlled a vast territory and their kraals (enkang'itie) were prosperous.

The Laikipiak were known for their military prowess and their aggressive expansion. Unlike 
some other Maasai sections that maintained peaceful coexistence, the Laikipiak frequently 
raided neighboring sections — the Ilpurko, Ildamat, Ilkeekonyokie, and others — seizing 
cattle and territory.

**En taata kitok, Laikipiak eidim olosho kitok. Ilmurran en Laikipiak eidim oleng, nabo 
eidim, nabo eidim en oltureshi. Eidim enkop kitok ne enkang'itie eidim nanyore.**

**Laikipiak eidim en oltureshi nabo eidim en iloshon ake — Ilpurko, Ildamat, 
Ilkeekonyokie, ne iloshon ake — eidim inkishu nabo enkop.**

---

### The Iloikop Wars — Iltureshi en Iloikop

The Laikipiak's aggressive expansion eventually united the other Maasai sections against them 
in a devastating series of conflicts known as the **Iloikop Wars** (approximately 1830s–1870s).

The term "Iloikop" is debated — it may refer to the Laikipiak and their allies, or to a 
broader group of agriculturalist/mixed-economy Maasai who were seen as different from the 
purely pastoral Maasai.

**Iltureshi en Iloikop ake eidurru Ilmaasai oleng le Laikipiak en taata kitok (1830–1870). 
Enkaraki "Iloikop" ake eidaŋat Laikipiak nabo iltung'anak eiyie.**

#### The Coalition Against the Laikipiak

Faced with relentless Laikipiak raids, several Maasai sections formed a grand coalition:

- **Ilpurko** — led the military campaign as the largest opposing section
- **Ildamat** — joined with experienced warriors
- **Ilkeekonyokie** — contributed fighters from the Ngong Hills area
- **Ilkaputiei** — allied from the Kitengela plains
- **Ilmatapato** — added strength from Kajiado

This alliance was unprecedented in Maasai history — sections that had competed with each 
other set aside their rivalries to face a common threat.

**Iloshon oleng eidurru le Laikipiak: Ilpurko, Ildamat, Ilkeekonyokie, Ilkaputiei, 
Ilmatapato. Iloshon nee meeidurru taata oleng — kake eidurru le Laikipiak.**

#### The Decisive Battles

The Iloikop Wars culminated in a series of devastating battles across the Laikipia plateau. 
The Laikipiak, despite their strength, were outnumbered by the combined forces of the coalition. 
Battle by battle, the Laikipiak were pushed back.

The final defeat was catastrophic. The Laikipiak enkang'itie were destroyed. Their cattle — 
the measure of their wealth and power — were seized. The survivors scattered in all directions.

**Iltureshi en Iloikop eidim en Laikipia oleng. Laikipiak, eidim, kake iloshon eidurru 
eidim oleng. Oltureshi en oltureshi, Laikipiak eitu.**

**Iltureshi en taata ake eidim kitok oleng. Enkang'itie en Laikipiak eidim. Inkishu eiyie 
eidim. Iltung'anak eitu en enkop oleng.**

---

### The Diaspora — Eitu en Laikipiak

After their defeat, the surviving Laikipiak dispersed:

1. **Absorbed into the Ilpurko** — Many Laikipiak refugees were taken in by the victorious 
   Ilpurko section, merging into their community.

2. **Joined the Samburu** — Some Laikipiak fled northward into Samburu territory. Their 
   warriors and families were integrated into the Samburu community. Some scholars believe 
   the Laikipiak influence helped shape Samburu warrior traditions.

3. **Absorbed by other sections** — Smaller groups were absorbed by the Ildamat, 
   Ilkeekonyokie, and other neighboring sections.

4. **Fled to peripheral areas** — Some Laikipiak remnants settled in marginal lands 
   outside the traditional Maasai territory.

**Netii iltureshi, Laikipiak eitu en enkop oleng:**

**1. Eidurru Ilpurko — Laikipiak oleng eidurru Ilpurko.**

**2. Eidurru Samburu — Laikipiak ake eitu nemeeta ne eidurru Samburu. Ilmurran nabo 
ilpayiani eidurru Samburu.**

**3. Eidurru iloshon ake — Iltung'anak eidurru Ildamat, Ilkeekonyokie, ne iloshon ake.**

**4. Eitu en enkop ake — Laikipiak ake eidurru en enkop meeta Ilmaasai.**

---

### Legacy — Enkoitoi en Laikipiak

Despite their defeat, the Laikipiak left an indelible mark on Maasai history:

- **The Laikipia Plateau** bears their name to this day — a reminder of their former dominance.
- **Genetic and cultural legacy** — Laikipiak blood and customs live on in the Ilpurko, 
  Samburu, and other sections that absorbed their survivors.
- **The warning** — The Laikipiak story is told across all Maasai sections as a cautionary 
  tale about the dangers of pride and aggression. "Even the strongest section cannot stand 
  against unity."
- **The proverb** — "Keidurr iltung'anak kake meidur ildonyo" (People move but mountains 
  do not) is often cited in reference to the Laikipiak — their people were scattered, but 
  the land remains.

**Laikipiak eidim enkoitoi en Ilmaasai oleng:**

**- Laikipia ake enkaraki eiyie en taata — eidaŋat ne eidim en taata.**

**- Laikipiak en iltung'anak nabo oloshon ia en Ilpurko, Samburu, ne iloshon ake.**

**- Nkatini en Laikipiak eidaŋat Ilmaasai oleng: 'Olosho kitok meeidim le iloshon eidurru.'**

**- 'Keidurr iltung'anak kake meidur ildonyo' — Iltung'anak eitu, kake enkop ia.**

---

### The Laikipiak Today — Laikipiak en Taata

Today, the Laikipia Plateau is one of Kenya's most important wildlife conservation areas. 
The land that once sustained the Laikipiak's great herds now supports community conservancies 
where Maasai and other communities work alongside wildlife.

Some families in the Ilpurko and Samburu sections trace their lineage back to the Laikipiak. 
The memory of the Laikipiak is kept alive through oral history, songs, and the age-set system 
that connects current generations to those who lived through the Iloikop Wars.

The Laikipiak story reminds us that strength without wisdom, and power without unity, lead to 
destruction. But it also shows the resilience of the Maasai — even after catastrophic defeat, 
the survivors rebuilt their lives, preserved their culture, and their legacy endures.

**En taata, Laikipia ake enkop en Kenya nanyore le ilowuarak. Enkop en Laikipiak en taata 
ake eidim oloshon ne ilowuarak.**

**Iltung'anak en Ilpurko nabo Samburu eidim enkoitoi en Laikipiak. Nkatini en Laikipiak 
ia en enkutuk, olalem, nabo olporror.**

**Nkatini en Laikipiak eidaŋat: eidim meeta enkoitoi, nabo eidim meeta eidurru, eidim 
oltureshi. Kake Ilmaasai eidim — netii iltureshi, iltung'anak eidim ne oloshon ia.**
"""


# ============================================================================
# CULTURE CONTENT
# ============================================================================
CULTURE_SECTIONS = {
    "🙏 Philosophy & Spirituality": (
        "### Enkai — The Supreme Deity\n\n"
        "Enkai (also Engai, Ngai) is the supreme god of the Maasai. Enkai has two aspects:\n\n"
        "- **Enkai Narok** (Black God) — benevolent, associated with rain, fertility, dark rain clouds\n"
        "- **Enkai Nanyokie** (Red God) — vengeful, associated with drought, famine, lightning\n\n"
        "The Maasai pray to Enkai at **Ol Doinyo Lengai** (Mountain of God), a sacred active volcano in Tanzania.\n\n"
        "### Core Values\n\n"
        "| Maasai Term | Meaning | Significance |\n"
        "|---|---|---|\n"
        "| **Osotua** | Mutual obligation | Sacred bond of trust — gifts cannot be refused |\n"
        "| **Enkanyit** | Respect | Foundation of social order — respect for elders, cattle, land |\n"
        "| **Osilalei** | Peace | Highest aspiration — peace-making involves sharing milk |\n"
        "| **Olelem** | Blessing | Elders bless through prayer and sacred spitting |"
    ),
    "⚔️ Age-Set System": (
        "### Olporror — The Age-Set\n\n"
        "The age-set system organizes Maasai men into named generational groups:\n\n"
        "1. **Enkipaata** — Pre-circumcision gathering, boys travel between homesteads\n"
        "2. **Emuratta** — Circumcision, transforms boys into ilmurran (warriors)\n"
        "3. **Warrior Period** (~15 years) — Protect community, live in emanyatta\n"
        "4. **Eunoto** — Graduation from warrior to junior elder (mothers shave sons' hair)\n"
        "5. **Olngesher** — Promotion to senior elder with decision-making authority\n\n"
        "Named age-sets include: *Ilterito, Ilnyangusi, Iseuri, Ilkitoip*"
    ),
    "🏠 Enkang (Homestead)": (
        "### Structure\n\n"
        "- **Olale** — Circular thornbush fence protecting against predators\n"
        "- **Enkajijik** — Houses arranged in a circle (built by women from mud, dung, sticks)\n"
        "- **Central cattle pen** — Heart of the enkang\n"
        "- **Enkiok** — Central hearth fire in each house\n\n"
        "### Social Organization\n\n"
        "Each enkang houses an extended family: a senior elder, his wives (each with her own enkaji), "
        "children, and sometimes married sons. The community moves when grazing is depleted."
    ),
    "🐄 Cattle Culture": (
        "### Inkishu — The Center of Life\n\n"
        "'Meishoo iyiook enkai inkishu o-inkujit' — God gave us cattle and grass.\n\n"
        "- **Wealth** — Measured in cattle, not money\n"
        "- **Diet** — Milk (kule), blood, meat, fermented milk (osarua)\n"
        "- **Bride-price** — Paid in cattle (inkishu oo nkitok)\n"
        "- **Ceremony** — Specific cattle required for different rituals\n"
        "- **Identity** — Every animal named, known by markings and lineage\n"
        "- **Vocabulary** — Dozens of words for cattle colors, horn shapes, ages"
    ),
    "📿 Beadwork & Colors": (
        "### Osinka — Beadwork Meanings\n\n"
        "| Color | Meaning |\n"
        "|---|---|\n"
        "| 🔴 **Red** | Bravery, strength, unity, blood |\n"
        "| 🔵 **Blue** | Sky, water, energy — gift of rain from Enkai |\n"
        "| 🟢 **Green** | Land, health, pastures that feed cattle |\n"
        "| ⚪ **White** | Peace, purity — used in ceremonies |\n"
        "| 🟠 **Orange** | Hospitality, warmth, community |\n"
        "| 🟡 **Yellow** | Fertility, growth, sun |\n"
        "| ⚫ **Black** | The people, solidarity, rain clouds |"
    ),
    "🗺️ Iloshon (Sections)": (
        "### Major Maasai Sections\n\n"
        "| Section | Location | Notable |\n"
        "|---|---|---|\n"
        "| **Ilkisongo** | Tanzania | Largest section, strong traditions |\n"
        "| **Ilpurko** | Kenya | Standard Maa dialect |\n"
        "| **Ildamat** | Narok, Kenya | Major Kenya section |\n"
        "| **Ilkeekonyokie** | Ngong Hills | Near Nairobi |\n"
        "| **Ilkaputiei** | Kitengela | Southeast of Nairobi |\n"
        "| **Ilmatapato** | Kajiado | Southern Kenya |\n"
        "| **Laikipiak** | Laikipia Plateau | Historically powerful, defeated in Iloikop Wars |\n"
        "| **Isiria** | Mara region | Near Maasai Mara |\n"
        "| **Ilarusa** | Arusha, Tanzania | More settled |\n"
        "| **Ilparakuyo** | E. Tanzania | Related pastoral group |\n"
        "| **Ldikiri** | Various | Unique traditions |\n"
        "| **Samburu** | N. Kenya | Related Maa-speakers |"
    ),
}


# ---------------------------------------------------------------------------
# Build the App
# ---------------------------------------------------------------------------
def load_css() -> str:
    if CSS_PATH.exists():
        return CSS_PATH.read_text(encoding="utf-8")
    return ""


def build_app() -> gr.Blocks:
    custom_css = load_css()

    with gr.Blocks(
        title="Maasai Language Showcase — Enkutuk oo lMaa",
        css=custom_css,
        theme=gr.themes.Base(
            primary_hue=gr.themes.Color(
                c50="#FDE8E5", c100="#F9C1BB", c200="#F49992",
                c300="#EF7268", c400="#EA4A3F", c500="#C0392B",
                c600="#A73125", c700="#8E291F", c800="#742119", c900="#5B1913",
                c950="#3D100C",
            ),
            secondary_hue="orange",
            neutral_hue="gray",
            font=["Inter", "system-ui", "sans-serif"],
        ),
    ) as app:
        # ===== HERO BANNER =====
        gr.HTML("""
        <div class="hero-banner">
            <h1>🛡️ Enkutuk oo lMaa — Maasai Language Showcase</h1>
            <p>
                Research-grade English ↔ Maasai translation, speech transcription, 
                and cultural preservation platform. Built with respect for the Maa language 
                and the traditions of the Maasai people.
            </p>
            <div class="hero-subtitle">
                <strong>NorthernTribe-Research</strong> · Powered by Gemma + QLoRA + Paza ASR 
                · Covering all iloshon: Ldikiri · Laikipiak · Samburu · Ilkisongo · Ilpurko · and more
            </div>
        </div>
        <div class="beadwork-stripe"></div>
        """)

        # ===== TABS =====
        with gr.Tabs():
            # ─── TAB 1: Translation ───
            with gr.Tab("🔤 Translation"):
                gr.HTML("<h2 style='color:#C0392B; margin-bottom:0.5rem;'>English ↔ Maasai Translation</h2>")
                gr.HTML(
                    "<p class='workflow-note'>"
                    "Focus here for the core Space workflow: translation first, cultural reference second. "
                    "Detected glossary terms are surfaced inline so protected Maa vocabulary is not hidden in a separate tab."
                    "</p>"
                )
                translation_status = gr.HTML(render_runtime_status())

                with gr.Row():
                    direction_dd = gr.Dropdown(
                        choices=["English → Maasai", "Maasai → English"],
                        value="English → Maasai",
                        label="Direction",
                        interactive=True,
                    )

                with gr.Row():
                    with gr.Column():
                        input_text = gr.Textbox(
                            label="Input Text",
                            placeholder="Tipika sirata...",
                            lines=5,
                        )
                        translate_btn = gr.Button("🔄 Translate", variant="primary", size="lg")

                    with gr.Column():
                        output_text = gr.Textbox(
                            label="Translation",
                            lines=5,
                            interactive=False,
                        )
                        voice_panel = gr.HTML(render_voice_panel("", "English → Maasai"))
                        glossary_matches = gr.Markdown(
                            value="### Glossary Support\nDetected protected terms will appear here when you translate.",
                            elem_classes=["glossary-panel"],
                        )

                translate_btn.click(
                    fn=translate_with_context,
                    inputs=[input_text, direction_dd],
                    outputs=[output_text, glossary_matches, translation_status, voice_panel],
                )

                gr.HTML("<div class='beadwork-stripe'></div>")

                gr.Examples(
                    examples=load_sample_prompts(),
                    inputs=[input_text, direction_dd],
                    label="📝 Try These Examples",
                )

            # ─── TAB 2: Speech ───
            with gr.Tab("🎙️ Speech"):
                gr.HTML("<h2 style='color:#C0392B; margin-bottom:0.5rem;'>Maasai Speech Transcription</h2>")
                gr.HTML(f"<p style='color:#888;'>Powered by Microsoft Paza (<code>{ASR_MODEL_ID}</code>)</p>")
                gr.HTML(
                    "<p class='workflow-note'>"
                    "This path stays within scope: record or upload Maa speech, transcribe it, then optionally bridge it into English."
                    "</p>"
                )
                speech_status = gr.HTML(render_runtime_status())

                with gr.Row():
                    with gr.Column():
                        audio_input = gr.Audio(
                            label="Upload or Record Maasai Speech",
                            type="filepath",
                        )
                        with gr.Row():
                            transcribe_btn = gr.Button("📝 Transcribe", variant="primary")
                            transcribe_translate_btn = gr.Button("📝→🔤 Transcribe & Translate", variant="secondary")

                    with gr.Column():
                        transcription_out = gr.Textbox(label="Transcription (Maasai)", lines=4, interactive=False)
                        translation_out = gr.Textbox(label="Translation (English)", lines=4, interactive=False)

                transcribe_btn.click(
                    fn=transcribe_audio_with_status,
                    inputs=audio_input,
                    outputs=[transcription_out, speech_status],
                )
                transcribe_translate_btn.click(
                    fn=transcribe_and_translate_with_status,
                    inputs=audio_input,
                    outputs=[transcription_out, translation_out, speech_status],
                )

            # ─── TAB 3: Nkatini & Oyete ───
            with gr.Tab("📖 Nkatini & Oyete"):
                gr.HTML("""
                <div class="culture-section">
                    <h2>📖 Nkatini (Folk Stories) & Oyete (Riddles)</h2>
                    <p style="color:#B0B0B0;">
                        <strong>Nkatini</strong> are traditional Maasai folk tales, told by elders around the fire. 
                        They teach moral lessons, preserve history, and transmit cultural values.<br>
                        <strong>Oyete</strong> are riddles exchanged among community members to sharpen the mind.
                    </p>
                </div>
                """)

                gr.HTML("<h3 style='color:#E67E22; margin:1rem 0;'>📚 Select a Story (Bilingual: English & Maasai)</h3>")

                story_select = gr.Dropdown(
                    choices=list(NKATINI_STORIES.keys()),
                    value=list(NKATINI_STORIES.keys())[0],
                    label="Choose a Nkatini",
                    interactive=True,
                )

                with gr.Row():
                    with gr.Column():
                        story_en = gr.Markdown(label="English")
                    with gr.Column():
                        story_mas = gr.Markdown(label="Maasai")

                def load_story(title):
                    story = NKATINI_STORIES.get(title, {})
                    en_text = f"### 🇬🇧 English\n\n{story.get('en', '')}"
                    mas_text = f"### 🔴 Maasai (Maa)\n\n{story.get('mas', '')}"
                    return en_text, mas_text

                story_select.change(fn=load_story, inputs=story_select, outputs=[story_en, story_mas])
                app.load(fn=load_story, inputs=story_select, outputs=[story_en, story_mas])

                gr.HTML("<div class='beadwork-stripe'></div>")

                # Oyete Section
                gr.HTML("<h3 style='color:#E67E22; margin:1rem 0;'>🧩 Oyete — Maasai Riddles</h3>")

                riddle_html = ""
                for i, r in enumerate(OYETE_RIDDLES):
                    riddle_html += f"""
                    <div class="story-card">
                        <h3>Oyete #{i+1}</h3>
                        <p><strong>Maasai:</strong> <em>{r['riddle_mas']}</em></p>
                        <p><strong>English:</strong> <em>{r['riddle_en']}</em></p>
                        <details><summary style="color:#D4AC0D; cursor:pointer; font-weight:600;">
                            🔓 Reveal Answer</summary>
                            <p style="margin-top:0.5rem; color:#27AE60;"><strong>{r['answer']}</strong></p>
                        </details>
                    </div>
                    """
                gr.HTML(riddle_html)

            # ─── TAB 4: Culture ───
            with gr.Tab("🏛️ Culture"):
                gr.HTML("""
                <div class="culture-section">
                    <h2>🏛️ Maasai Culture Explorer</h2>
                    <p style="color:#B0B0B0;">
                        Explore the philosophy, social systems, ceremonies, and daily life of the Maasai people.
                    </p>
                </div>
                """)

                for section_title, content in CULTURE_SECTIONS.items():
                    with gr.Accordion(section_title, open=False):
                        gr.Markdown(content)

            # ─── TAB 5: Glossary ───
            with gr.Tab("📚 Glossary"):
                gr.HTML("""
                <div class="culture-section">
                    <h2>📚 Maasai Glossary & Term Search</h2>
                    <p style="color:#B0B0B0;">
                        Search protected cultural terms and learn their meanings, domains, and cultural significance.
                        🔒 Protected terms are preserved exactly in translations to prevent cultural flattening.
                    </p>
                </div>
                """)

                with gr.Row():
                    with gr.Column():
                        search_query = gr.Textbox(
                            label="Search Term",
                            placeholder="e.g., Enkai, enkang, ilmurran...",
                            lines=1,
                        )
                    with gr.Column():
                        domain_filter = gr.Dropdown(
                            choices=get_glossary_domain_choices(),
                            value="all",
                            label="Domain Filter",
                            interactive=True,
                        )

                search_btn = gr.Button("🔍 Search Glossary", variant="primary")
                glossary_results = gr.Markdown(
                    value=search_glossary("", "all"),
                    label="Results",
                    elem_classes=["glossary-panel"],
                )

                search_btn.click(
                    fn=search_glossary,
                    inputs=[search_query, domain_filter],
                    outputs=glossary_results,
                )
                domain_filter.change(
                    fn=search_glossary,
                    inputs=[search_query, domain_filter],
                    outputs=glossary_results,
                )

                gr.HTML("<div class='beadwork-stripe'></div>")

                # Glossary statistics
                glossary_data = load_glossary_data()
                if glossary_data:
                    domain_counts = {}
                    preserve_count = 0
                    for entry in glossary_data:
                        domain = entry.get("domain", "other")
                        domain_counts[domain] = domain_counts.get(domain, 0) + 1
                        if entry.get("preserve"):
                            preserve_count += 1

                    stats_html = f"""
                    <h3 style="color:#E67E22; margin:1rem 0;">📊 Glossary Statistics</h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin:1rem 0;">
                        <div style="padding:1rem; background:#2A2A2A; border-radius:8px; border-left:4px solid #C0392B;">
                            <div style="color:#999; font-size:0.9rem;">Total Terms</div>
                            <div style="font-size:2rem; font-weight:bold; color:#C0392B;">{len(glossary_data)}</div>
                        </div>
                        <div style="padding:1rem; background:#2A2A2A; border-radius:8px; border-left:4px solid #E67E22;">
                            <div style="color:#999; font-size:0.9rem;">Protected Terms 🔒</div>
                            <div style="font-size:2rem; font-weight:bold; color:#E67E22;">{preserve_count}</div>
                        </div>
                        <div style="padding:1rem; background:#2A2A2A; border-radius:8px; border-left:4px solid #27AE60;">
                            <div style="color:#999; font-size:0.9rem;">Domains Covered</div>
                            <div style="font-size:2rem; font-weight:bold; color:#27AE60;">{len(domain_counts)}</div>
                        </div>
                    </div>

                    <h3 style="color:#E67E22; margin-top:1.5rem; margin-bottom:1rem;">Domain Breakdown</h3>
                    <ul style="color:#B0B0B0;">
                    """
                    for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1]):
                        stats_html += f"<li><strong>{domain.title()}:</strong> {count} terms</li>"
                    stats_html += "</ul>"
                    gr.HTML(stats_html)

            # ─── TAB 5: Laikipiak ───
            with gr.Tab("⚔️ Laikipiak"):

                gr.HTML("""
                <div class="laikipiak-doc">
                    <p style="color:#B0B0B0; font-style:italic;">
                        Complete bilingual documentation of the Laikipiak section — from their rise as the most 
                        powerful Maasai iloshon, through the devastating Iloikop Wars, to their legacy today.
                        Presented in both English and Maa.
                    </p>
                </div>
                """)
                gr.Markdown(LAIKIPIAK_DOC)

            # ─── TAB 7: About & Status ───
            with gr.Tab("ℹ️ About"):
                gr.HTML("""
                <div class="culture-section">
                    <h2>About This Project</h2>
                    <p style="color:#B0B0B0;">
                        The Maasai Language Showcase is a research-grade platform for English ↔ Maasai translation 
                        and Maasai speech transcription. It is built for language preservation, accessibility, and 
                        low-resource AI research.
                    </p>
                </div>
                """)

                gr.HTML("<h3 style='color:#E67E22; margin-top:1.5rem;'>🚀 System Status</h3>")
                gr.HTML(render_runtime_status())

                gr.HTML("""
                    <h3 style="color:#E67E22;">🏗️ Architecture</h3>
                    <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
                        <tr style="border-bottom:1px solid #3A3A3A;">
                            <td style="padding:0.5rem; color:#E67E22; font-weight:600;">Translation</td>
                            <td style="padding:0.5rem;">google/gemma-3-4b-it (QLoRA fine-tuned)</td>
                        </tr>
                        <tr style="border-bottom:1px solid #3A3A3A;">
                            <td style="padding:0.5rem; color:#E67E22; font-weight:600;">Speech</td>
                            <td style="padding:0.5rem;">microsoft/paza-whisper-large-v3-turbo</td>
                        </tr>
                        <tr style="border-bottom:1px solid #3A3A3A;">
                            <td style="padding:0.5rem; color:#E67E22; font-weight:600;">Inference</td>
                            <td style="padding:0.5rem;">llama.cpp (GGUF) via llama-cpp-python</td>
                        </tr>
                        <tr>
                            <td style="padding:0.5rem; color:#E67E22; font-weight:600;">UI</td>
                            <td style="padding:0.5rem;">Gradio with Maasai cultural theme</td>
                        </tr>
                    </table>
                    
                    <h3 style="color:#E67E22;">📊 Training Data</h3>
                    <ul style="color:#B0B0B0;">
                        <li>7,814 training pairs (85% of 9,194 total)</li>
                        <li>689 validation pairs (7.5%)</li>
                        <li>691 test pairs (7.5%)</li>
                        <li>91.8% gold-tier, 8.2% silver-tier quality</li>
                        <li>103+ protected cultural terms</li>
                        <li>14+ Maasai sections/sub-tribes covered</li>
                        <li>98% confidence threshold for preservation</li>
                    </ul>
                    
                    <h3 style="color:#E67E22;">🌍 Sub-tribes Covered</h3>
                    <p style="color:#B0B0B0;">
                        Ldikiri · Laikipiak · Samburu (Lmomonyot) · Ilkisongo · Ilpurko · Ildamat · 
                        Ilkeekonyokie · Iloodokilani · Ilkaputiei · Ilmatapato · Ilwuasinkishu · 
                        Isiria · Ilarusa · Ilparakuyo
                    </p>
                    
                    <h3 style="color:#E67E22;">⚠️ Limitations & Caveats</h3>
                    <ul style="color:#B0B0B0;">
                        <li><strong>Low-resource language</strong> — Maasai has limited digital resources; quality may vary by domain</li>
                        <li><strong>Orthography</strong> — Maasai orthography is not fully standardized; outputs may vary</li>
                        <li><strong>Native review</strong> — Outputs should be reviewed by native Maa speakers</li>
                        <li><strong>Not for safety-critical use</strong> — Not intended for legal, medical, or safety-critical translation</li>
                        <li><strong>Synthetic data</strong> — Significant portion of training data is synthetically generated</li>
                    </ul>

                    <h3 style="color:#E67E22;">📖 Citation</h3>
                    <p style="color:#B0B0B0; font-family:monospace; background:#1a1a1a; padding:1rem; border-radius:4px; word-break:break-all;">
                        @dataset{maasai_translation_corpus_2026,<br/>
                        &nbsp;&nbsp;title={Maasai English Translation Corpus},<br/>
                        &nbsp;&nbsp;author={NorthernTribe-Research},<br/>
                        &nbsp;&nbsp;year={2026},<br/>
                        &nbsp;&nbsp;publisher={Hugging Face},<br/>
                        &nbsp;&nbsp;url={https://huggingface.co/datasets/NorthernTribe-Research/maasai-translation-corpus}<br/>
                        }
                    </p>
                    
                    <h3 style="color:#E67E22;">🤝 Community & Ethics</h3>
                    <p style="color:#B0B0B0;">
                        This project is built with respect for the Maasai communities and the Maa language. 
                        All work is guided by principles of cultural sensitivity, community benefit, and linguistic preservation.
                    </p>

                    <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #3A3A3A;">
                        <p style="color:#888; font-size:0.9rem; text-align:center;">
                            Built by <strong>NorthernTribe-Research</strong> for the preservation and 
                            accessibility of the Maasai (Maa) language.<br/>
                            <em>With respect for the Maasai communities whose language this project serves.</em><br/>
                            <strong>March 2026</strong>
                        </p>
                    </div>
                </div>
                """)

        # ===== FOOTER =====

        gr.HTML("""
        <div class="beadwork-stripe"></div>
        <div class="footer-note">
            <strong>Enkutuk oo lMaa</strong> — The Maasai Language Showcase<br>
            NorthernTribe-Research · 2026<br>
            <em>"Meishoo iyiook enkai inkishu o-inkujit"</em> — God gave us cattle and grass
        </div>
        """)

    return app


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app = build_app()
    app.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_api=False,
    )
