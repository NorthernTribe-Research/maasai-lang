#!/usr/bin/env python3
"""
Generate a massive, comprehensive Maasai knowledge corpus for fine-tuning.

This goes far beyond basic translation pairs — it creates deep cultural knowledge
including folk stories, mythology, proverbs, grammar explanations, cultural Q&A,
sub-tribe histories, ceremony descriptions, and conversational dialogue.

The model must understand EVERYTHING about Maasai culture, not just translate words.

Output: data/raw/maasai_knowledge_corpus.jsonl
"""

from __future__ import annotations

import json
from pathlib import Path


def write_records(records: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def make_qa(question: str, answer: str, domain: str) -> dict:
    """Create a Q&A instruction-tuning record."""
    return {
        "source_text": question,
        "target_text": answer,
        "source_lang": "en",
        "target_lang": "en",
        "domain": domain,
        "source_name": "cultural_knowledge",
        "quality_score": 1.0,
        "notes": "Cultural knowledge Q&A for deep model understanding",
    }


def make_bilingual(en: str, mas: str, domain: str) -> list[dict]:
    """Create bidirectional translation pairs."""
    return [
        {
            "source_text": en,
            "target_text": mas,
            "source_lang": "en",
            "target_lang": "mas",
            "domain": domain,
            "source_name": "extended_cultural",
            "quality_score": 1.0,
            "notes": "Extended cultural bilingual pair",
        },
        {
            "source_text": mas,
            "target_text": en,
            "source_lang": "mas",
            "target_lang": "en",
            "domain": domain,
            "source_name": "extended_cultural",
            "quality_score": 1.0,
            "notes": "Extended cultural bilingual pair (reverse)",
        },
    ]


def make_story_record(title: str, story_en: str, domain: str = "folklore") -> dict:
    """Create a folk story / narrative record."""
    return {
        "source_text": f"Tell me the Maasai story of {title}",
        "target_text": story_en,
        "source_lang": "en",
        "target_lang": "en",
        "domain": domain,
        "source_name": "folklore_narrative",
        "quality_score": 1.0,
        "notes": "Maasai folk story / oral tradition for deep cultural understanding",
    }


# ============================================================================
# FOLK STORIES & ORIGIN MYTHS
# ============================================================================
FOLK_STORIES = [
    make_story_record(
        "How Enkai Gave Cattle to the Maasai",
        "In the beginning, Enkai (God) lived on Earth together with the people. Enkai owned all the cattle "
        "in the world. When the time came for Enkai to ascend to the sky, Enkai decided to entrust the "
        "cattle to the Maasai people. Enkai gathered all the cattle and sent them sliding down from heaven "
        "along the roots of a great wild fig tree. The cattle tumbled down from the sky, one by one, into "
        "the waiting arms of the Maasai. As the cattle descended, some people from other nations tried "
        "to take them, but the Maasai stood firm and received the cattle as Enkai intended. This is why "
        "the Maasai believe that all cattle in the world rightfully belong to them — they were given "
        "as a sacred gift from Enkai Narok (the benevolent Black God). To this day, the Maasai say: "
        "'Meishoo iyiook enkai inkishu o-inkujit' — God gave us cattle and grass. Anyone who has cattle "
        "has them because they borrowed them from the Maasai."
    ),
    make_story_record(
        "The Separation of Heaven and Earth",
        "Long ago, the sky and the earth were connected. Enkai lived among the people, and there was "
        "no separation between the divine and the mortal world. The cattle roamed freely between heaven "
        "and earth. Then one day, the sky began to lift away from the earth. As it rose higher and higher, "
        "Enkai took hold of a great rope made from the bark of a sacred tree and let the cattle descend "
        "to the Maasai below. But as the last cattle were coming down, a hunter from another tribe, "
        "jealous of the Maasai's wealth, cut the rope with his arrow. The remaining cattle fell, "
        "some were scattered, and the connection between heaven and earth was finally severed. "
        "This is why the Maasai must now pray to Enkai by looking upward at the sacred mountain, "
        "Ol Doinyo Lengai (the Mountain of God), where they believe Enkai still watches over them."
    ),
    make_story_record(
        "The Three Sons of Enkai",
        "Enkai created three groups of people and gave each a gift. To the first son, Enkai gave a "
        "spear and a shield for hunting. This son became the ancestor of the hunting peoples. To the "
        "second son, Enkai gave a digging stick and seeds for farming. This son became the ancestor "
        "of the agricultural peoples. To the third son — the Maasai ancestor — Enkai gave a herding "
        "stick and cattle. 'Take this stick,' said Enkai, 'and with it guide my cattle. They are yours "
        "to keep, to protect, and to cherish. The grass is your wealth and the cattle are your children.' "
        "The Maasai accepted this gift with gratitude and have been the custodians of cattle ever since. "
        "This is why the Maasai do not traditionally farm or hunt — their covenant with Enkai is to "
        "tend the cattle, and the cattle provide everything they need: milk, blood, meat, and hides."
    ),
    make_story_record(
        "The Lion and the Maasai Warrior",
        "There was once a young olmurrani (warrior) who was sent to prove his bravery. The elders told "
        "him: 'Go into the bush and face the lion. Do not run. The lion will see your courage and know "
        "that you are Maasai.' The young warrior took his spear and his shield painted with the markings "
        "of his age-set. He walked into the tall grass where the great lion waited. When the lion charged, "
        "the warrior stood his ground. He planted his feet like the roots of an oreteti (tree) and raised "
        "his spear. The lion leaped, and the warrior struck true. When he returned to the enkang "
        "(homestead), the elders received him with the blessing: 'Meishoo Enkai' (God bless you). "
        "His mother shaved his warrior hair as part of the eunoto (graduation) ceremony, and he was "
        "recognized as a man of courage. This story teaches that bravery is not the absence of fear, "
        "but the strength to face what must be faced."
    ),
    make_story_record(
        "Why the Donkey Carries Burdens",
        "In the old days, the donkey (olmotoni) was proud and lazy. While the cattle gave milk and "
        "the goats gave meat, the donkey refused to help the Maasai. 'I am too beautiful to carry loads,' "
        "said the donkey. 'Let the cattle do the work.' Enkai heard this and said: 'Because you are "
        "proud and refuse to serve, you will carry the heaviest loads for all time. You will carry water, "
        "firewood, and the belongings of families as they move between pastures.' And so the donkey "
        "was humbled. The Maasai say this story teaches that pride without purpose leads to servitude, "
        "and that every creature has a role in the community."
    ),
    make_story_record(
        "The Origin of the Maasai Age-Set System",
        "When the Maasai were still young as a people, there was chaos among the men. Young boys "
        "fought with old men, and there was no order. Enkai looked down and said: 'I will give you a "
        "system so that each man knows his place.' Enkai instructed the oloiboni (spiritual leader) to "
        "divide the men into groups based on when they were circumcised. Those circumcised together would "
        "form an olporror (age-set), and each age-set would have its name and its duties. The youngest "
        "would be the ilmurran (warriors), protecting the community and the cattle. As they grew older, "
        "they would pass through the eunoto ceremony and become junior elders, then senior elders through "
        "the olngesher ceremony. The senior elders would be the decision-makers, the keepers of wisdom. "
        "This system brought order to the Maasai. It continues today, with age-sets like Ilterito, "
        "Ilnyangusi, Iseuri, and Ilkitoip organizing society across all iloshon (sections)."
    ),
    make_story_record(
        "The Laikipiak and the Great Wars",
        "The Laikipiak were once the most powerful of all Maasai sections. They controlled the vast "
        "Laikipia plateau, rich in grasslands and water. Their warriors were feared by all. But the "
        "Laikipiak grew arrogant. They began raiding other Maasai sections — the Ilpurko, the Ildamat, "
        "the Ilkeekonyokie — stealing their cattle and claiming superiority. The other sections could "
        "not endure this, and they united against the Laikipiak. The wars that followed — known as "
        "the Iloikop Wars — were devastating. The united Maasai sections defeated the Laikipiak and "
        "scattered their people. Some Laikipiak refugees were absorbed into the Ilpurko and other sections. "
        "Others fled north and joined the Samburu. The great Laikipiak territory was lost. This story "
        "is told as a warning: even the strongest section cannot stand against unity. Pride and aggression "
        "destroy what cooperation builds."
    ),
    make_story_record(
        "How the Samburu and Maasai Became Separate",
        "The Samburu (also called Lmomonyot or Loikop) and the Maasai were once one people, speaking "
        "the same language and following the same customs. They lived together in the great grasslands. "
        "But as their herds grew and the population increased, they needed more land. Some families "
        "moved northward into the highlands and semi-arid lands around Samburu and Marsabit. Over time, "
        "the northern group developed their own identity. They kept many of the old Maa words that the "
        "southern Maasai changed. They developed their own beadwork patterns and ceremony traditions, "
        "though the age-set system and the reverence for cattle remained the same. Today, the Samburu "
        "speak a dialect of Maa that is mutually intelligible with Maasai proper, though some words and "
        "pronunciations differ. The Samburu are sometimes called 'the butterflies' because of their "
        "colorful beadwork and dress."
    ),
    make_story_record(
        "The Woman Who Saved the Enkang",
        "There was a time when a drought came so severe that the rivers dried and the grass withered. "
        "The cattle began to die, one by one. The men of the enkang sat in despair, unable to find "
        "water. But one woman — a mother of five children — remembered a story her grandmother had told "
        "her about a hidden spring beneath a great acacia tree on the far side of the olkeri (dry season "
        "pasture). Without telling the men, she took her calabash and walked three days through the "
        "scorching heat. She found the spring exactly where her grandmother had said. She filled her "
        "calabash and returned to guide the whole enkang to the water. The cattle were saved. The elders "
        "praised her, saying: 'Enkai speaks through the wisdom of women.' This story is told to remind "
        "the community that women are the keepers of vital knowledge and that their wisdom saves lives."
    ),
    make_story_record(
        "Enkai's Two Faces",
        "The Maasai know that Enkai has two aspects. Enkai Narok — the Black God — is loving and "
        "generous. When the sky is dark with rain clouds, the Maasai rejoice, for Enkai Narok is "
        "blessing the land with water. The grass will grow, the cattle will be fat, and the children "
        "will have milk. But when the sun burns red and the sky is clear for too long, Enkai Nanyokie — "
        "the Red God — is showing displeasure. Drought comes, disease follows, and the people must "
        "pray harder. The Maasai do not view these as two separate gods, but as two moods of the same "
        "Enkai. Just as a parent can be both loving and stern, Enkai governs the world with both grace "
        "and discipline. When times are hard, the Maasai travel to Ol Doinyo Lengai (the Mountain of "
        "God) to offer prayers, asking Enkai Narok to return. They bring offerings of milk and honey, "
        "and the oloiboni leads the prayers."
    ),
]

# ============================================================================
# PROVERBS WITH EXPLANATIONS (Maasai -> English -> Explanation)
# ============================================================================
PROVERBS = [
    # (Maasai proverb, English translation, Cultural explanation)
    ("Meeta enkop oo ltung'ani.", "No land belongs to one person.",
     "This proverb reflects the Maasai communal philosophy of land. The land is shared by the community and managed collectively. No individual can claim permanent ownership — people are temporary custodians of the earth."),
    ("Eelaenkishui nkatitin.", "Life has seasons.",
     "Just as the Maasai pastoral cycle follows the wet and dry seasons, human life has periods of abundance and hardship. Patience during difficult times is essential because the seasons always change."),
    ("Eisapuk eukongu Enkai.", "The eye of God is big.",
     "Nothing escapes Enkai's notice. This proverb warns against wrongdoing and encourages honesty, because Enkai sees all actions, even those hidden from other people."),
    ("Erruesh olenkaina enaimurruai.", "The elephant can be tripped by a creeping plant.",
     "Even the strongest and most powerful can be brought down by something small and seemingly insignificant. This teaches humility and warns against underestimating others."),
    ("Esuj erashe ng'ejuk emusana.", "A new idea follows an old one.",
     "Innovation and wisdom build upon tradition. The Maasai value both ancestral knowledge and new thinking, understanding that progress comes from honoring what came before."),
    ("Keidurr iltung'anak kake meidur ildonyo.", "People move but mountains do not.",
     "This proverb speaks to impermanence. People come and go, but the land endures. It teaches the Maasai to remember their roots and their connection to the earth."),
    ("Meinyoo enjin nabo enkima.", "One finger cannot kill a louse.",
     "Unity is essential. No single person can accomplish what a community can achieve together. This is fundamental to the Maasai age-set system where collective action is the norm."),
    ("Meeta olee oji naai.", "No enemy comes from outside.",
     "The greatest threats come from within the community — jealousy, greed, and division. This proverb urges internal harmony and warns against internal conflict."),
    ("Entai olkijape oltarakwa.", "The bitter one brings the sweet.",
     "Hardship precedes reward. The Maasai, who endure harsh conditions as pastoralists, understand that struggle is the path to resilience and eventual prosperity."),
    ("Metabau oltiankali enkolong.", "The teacher does not drink from the river.",
     "A teacher must lead by example and maintain discipline. Those who guide others must hold themselves to a higher standard."),
    ("Menyoo olee oji naai, keidurr olee oji nkutuk.", "The enemy does not come from afar, but from your own mouth.",
     "Careless speech causes more harm than external threats. Words have power, and the Maasai value measured, thoughtful communication."),
    ("Eitu enkereri nabo oleng.", "One gourd is not sufficient.",
     "Diversity and abundance are needed for security. Just as one calabash of milk cannot feed a family, one source of support is not enough."),
    ("Etaa enkop tenebo intae.", "The land goes with its people.",
     "Land and people are inseparable. The Maasai's identity is tied to their territory, and displacement from the land is displacement from identity."),
    ("Meiruk olee inepu dukuya.", "He who hurries does not arrive.",
     "Patience leads to better outcomes than haste. The Maasai, whose pastoral life requires long-term planning, value deliberation over impulsiveness."),
    ("Naa sidai pee elu inkishu.", "It is good when the cattle return.",
     "The safe return of cattle is the highest sign of prosperity and well-being. This proverb is both literal — cattle coming home safely — and metaphorical — good things returning."),
]

# ============================================================================
# CULTURAL KNOWLEDGE Q&A
# ============================================================================
CULTURAL_QA = [
    make_qa(
        "What is the Maasai age-set system?",
        "The Maasai age-set system (olporror) organizes men into named generational groups based on when they were circumcised. "
        "Boys circumcised during the same period form an age-set that stays together for life. The cycle begins with enkipaata "
        "(pre-circumcision gathering), then emuratta (circumcision), which makes them ilmurran (warriors). Warriors protect the "
        "community and livestock for about 15 years. They then undergo eunoto (graduation ceremony) where their mothers shave "
        "their warrior hair, becoming junior elders. Later, through olngesher, they become senior elders (ilpayiani) who make "
        "community decisions. Named age-sets include Ilterito, Ilnyangusi, Iseuri, Ilkitoip, and others. This system operates "
        "across all Maasai sections (iloshon) and provides social order, military organization, and generational identity.",
        "governance"
    ),
    make_qa(
        "Who is the oloiboni in Maasai society?",
        "The oloiboni (plural: iloibonok) is the Maasai spiritual leader, diviner, and ritual expert. The oloiboni is NOT a "
        "chief — the Maasai have no centralized political authority. Instead, the oloiboni serves as a prophet (interpreting "
        "dreams and signs), healer (using herbs and spiritual remedies), advisor (guiding community decisions), and ritual "
        "leader (performing ceremonies). The most famous oloiboni lineage traces back to Kidongoi, whose descendants include "
        "Mbatiany, Lenana, and Sendeu. The oloiboni's power comes from spiritual authority, not military force. Different "
        "Maasai sections have their own iloibonok, though the Ilkisongo oloiboni lineage is historically most prominent.",
        "governance"
    ),
    make_qa(
        "What are the major Maasai sub-tribes or sections?",
        "The Maasai are organized into territorial sections called iloshon (singular: olosho). Major sections include:\n"
        "- Ilkisongo: Largest section, mainly in Tanzania. Strong traditional practices.\n"
        "- Ilpurko: Major Kenya section. Their dialect is considered standard Maa.\n"
        "- Ildamat: Based around Narok, Kenya.\n"
        "- Ilkeekonyokie: Near Ngong Hills, Kenya.\n"
        "- Iloodokilani: 'Those of the river'.\n"
        "- Ilkaputiei: Around Kitengela plains near Nairobi.\n"
        "- Ilmatapato: Kajiado County, Kenya.\n"
        "- Laikipiak: Historically powerful, decimated in Iloikop Wars. Based on Laikipia Plateau.\n"
        "- Ilwuasinkishu: Formerly on Uasin Gishu plateau, largely displaced.\n"
        "- Isiria: Near Maasai Mara.\n"
        "- Ilarusa (Arusha): Near Mount Meru, Tanzania. More settled.\n"
        "- Ilparakuyo (Baraguyu): Central/eastern Tanzania. Distinct but related.\n"
        "- Ldikiri: Maintains unique traditions within the Maasai nation.\n"
        "- Samburu (Lmomonyot/Loikop): Related Maa-speaking group in northern Kenya.\n"
        "Each section has its own territory, slight dialect variations, and shield designs (elongo).",
        "governance"
    ),
    make_qa(
        "What is osotua in Maasai culture?",
        "Osotua is one of the most sacred concepts in Maasai philosophy. It means a bond of mutual obligation and deep trust "
        "between individuals, families, or clans. An osotua relationship is created when one person gives a gift to another "
        "in genuine need — but critically, the gift is NOT a loan and NOT a debt. It creates a lasting reciprocal bond. The "
        "recipient is not expected to 'repay' the exact gift, but is bound by honor to help their osotua partner when that "
        "partner is in need in the future. Osotua gifts cannot be refused. The bond is stronger than friendship and carries "
        "deep social weight. Violating an osotua bond is one of the most serious social transgressions in Maasai culture. "
        "Researchers have found that the osotua system functions as a sophisticated risk-sharing network that helps pastoralist "
        "communities survive droughts and other disasters — when one family loses cattle, their osotua partners help them rebuild.",
        "philosophy"
    ),
    make_qa(
        "What is the role of cattle in Maasai culture?",
        "Cattle (inkishu) are the absolute center of Maasai life — economically, socially, spiritually, and culturally. "
        "Key aspects:\n"
        "- Spiritual: The Maasai believe Enkai gave all cattle to them. 'Meishoo iyiook enkai inkishu o-inkujit' (God gave "
        "us cattle and grass). Cattle are a divine gift.\n"
        "- Wealth: A person's wealth is measured in cattle, not money. Bride-price (inkishu oo nkitok) is paid in cattle.\n"
        "- Diet: Milk (kule), blood, and meat form the traditional diet. Fermented milk (osarua) is a daily staple.\n"
        "- Social: Cattle are given as osotua gifts, used in ceremonies, and exchanged to build alliances.\n"
        "- Identity: Every Maasai has a deep personal relationship with their cattle. They name each animal, know its lineage, "
        "and can identify it by its markings and the sound of its bell.\n"
        "- Vocabulary: The Maa language has dozens of words for cattle of different colors, patterns, horn shapes, and ages.\n"
        "- Ceremony: Major ceremonies require specific cattle — a black ox for certain blessings, a white heifer for others.\n"
        "The Maasai phrase 'Inkishu e-Maasai' (cattle are Maasai) captures this: cattle and the Maasai are inseparable.",
        "livestock"
    ),
    make_qa(
        "Describe the Maasai e-unoto ceremony.",
        "E-unoto is one of the most important Maasai ceremonies. It marks the transition of ilmurran (warriors) from warrior "
        "status to junior elder status. The ceremony typically involves:\n"
        "1. Gathering: Warriors from the same age-set gather at a specially built ceremonial enkang called emanyatta.\n"
        "2. Ritual preparation: The warriors paint their bodies with red ochre and prepare their finest warrior regalia.\n"
        "3. Head shaving: The warrior's mother shaves his long ochre-dyed hair — a deeply emotional moment. The hair, which "
        "the warrior has grown throughout his warrior period, symbolizes his youth and warrior identity.\n"
        "4. Blessing: Elders and the oloiboni bless the graduating warriors.\n"
        "5. New status: After eunoto, the men are no longer ilmurran. They can now marry, build their own enkaji, and begin "
        "participating in community governance as junior elders.\n"
        "The ceremony takes several days and involves singing, dancing, feasting, and prayer. It is a bittersweet occasion — "
        "the warriors are leaving behind the freedom and glory of the warrior period, but gaining the respect and responsibility "
        "of elderhood. The mothers often weep during the head-shaving, mourning the end of their sons' youth.",
        "ceremony"
    ),
    make_qa(
        "How does the Maa language work grammatically?",
        "The Maa language (spoken by Maasai, Samburu, and related groups) has several distinctive features:\n"
        "- Word order: Verb-Subject-Object (VSO) is the basic order, unlike English SVO. Example: 'Aidim olpayian enkare' "
        "(Drinks elder water = The elder drinks water).\n"
        "- Tone: Maa is a tonal language. Tone distinguishes grammatical case — the same word with different tone patterns "
        "can mean subject vs. object.\n"
        "- Vowel harmony: Maa uses Advanced Tongue Root (ATR) vowel harmony. Vowels within a word must agree in their ATR "
        "quality (+ATR or -ATR). This affects word formation and conjugation.\n"
        "- Gender: Nouns have masculine and feminine gender, but gender assignment can change meaning (feminine often implies "
        "smaller size or pejorative).\n"
        "- Verb complexity: Verbs encode tense, aspect, person of subject AND person of object. A single verb form can express "
        "what would require a whole sentence in English.\n"
        "- Prepositions: Maa has only two true prepositions — one for 'with/accompaniment' and a general-purpose one.\n"
        "- Phonology: 30 contrasting phonemes including implosive consonants. Nine distinct vowels.\n"
        "- Noun case: Nominative vs. accusative case is marked by tone alone — the segmental (consonant/vowel) form stays "
        "the same, but the tone pattern changes.",
        "education"
    ),
    make_qa(
        "What is the significance of Ol Doinyo Lengai to the Maasai?",
        "Ol Doinyo Lengai (meaning 'Mountain of God' in Maa) is a sacred active volcano in northern Tanzania, near Lake "
        "Natron. It is the most sacred site in Maasai cosmology. Key significance:\n"
        "- The Maasai believe Enkai resides on or near Ol Doinyo Lengai.\n"
        "- During severe droughts, Maasai delegations travel to the mountain to perform prayers and make offerings of milk "
        "and honey, asking Enkai Narok to send rain.\n"
        "- The volcano's eruptions are interpreted as Enkai's communication — sometimes blessing, sometimes warning.\n"
        "- The mountain's unique white carbonatite lava gives it an otherworldly appearance that reinforces its spiritual status.\n"
        "- Fertility ceremonies and prayers for cattle health are performed at the mountain.\n"
        "- It is one of the few volcanoes in the world that erupts carbonatite lava, which is relatively cool and turns white "
        "upon exposure to moisture — giving the mountain a snow-like appearance in the tropics.\n"
        "Ol Doinyo Lengai represents the connection between the Maasai and the divine — it is where heaven meets earth.",
        "philosophy"
    ),
    make_qa(
        "What is the relationship between the Samburu and the Maasai?",
        "The Samburu (also known as Lmomonyot, Loikop, or Sampur) are a closely related Maa-speaking group in northern Kenya. "
        "Key relationships:\n"
        "- Language: The Samburu speak a dialect of Maa that is largely mutually intelligible with Maasai proper, though with "
        "some vocabulary and pronunciation differences. Samburu retain some archaic Maa forms.\n"
        "- Age-set system: Both use the olporror age-set system with similar ceremonies.\n"
        "- Cattle culture: Both are pastoralists with cattle at the center of their economy and identity.\n"
        "- Historical separation: The Samburu may be descended from Maasai groups (possibly including Laikipiak refugees) "
        "who migrated northward centuries ago.\n"
        "- Differences: Samburu have distinct beadwork patterns (often more colorful), their own ceremony traditions, and "
        "adapt to the more arid, highland environment of Samburu County.\n"
        "- Lmomonyot: This name means 'people of the land' and emphasizes the Samburu's connection to their northern "
        "territory. Some scholars consider this the original self-name.\n"
        "- Cultural exchange: Marriage between Maasai and Samburu families occurs, maintaining the connection.\n"
        "The Samburu are often called 'the closest relatives of the Maasai' — similar enough to understand each other's "
        "language and customs, different enough to maintain distinct identities.",
        "culture"
    ),
    make_qa(
        "Tell me about the Ldikiri Maasai section.",
        "The Ldikiri (also written Il-Dikiri or Ildikiri) are a Maasai section (olosho) within the broader Maasai nation. "
        "Like all iloshon, the Ldikiri maintain their specific territorial and clan identity while sharing the core Maasai "
        "cultural framework: the Maa language, the age-set system, cattle-centered pastoralism, and reverence for Enkai. "
        "Each Maasai section has its own geographic area, distinct shield designs (elongo), and may have slight dialect "
        "variations. The Ldikiri, along with other sections, participate in cross-section ceremonies and maintain osotua "
        "(mutual obligation) networks that link them to other Maasai communities. The section system allows the Maasai "
        "to maintain a shared cultural identity across vast territories while preserving local autonomy and identity.",
        "governance"
    ),
    make_qa(
        "What is the Lmomonyot tradition?",
        "Lmomonyot is another name for the Samburu people, meaning 'people of the land' in Maa. The Lmomonyot tradition "
        "encompasses:\n"
        "- A deep connection to the semi-arid highlands and rangelands of northern Kenya (Samburu, Marsabit, Isiolo counties).\n"
        "- Pastoral life revolving around cattle, goats, sheep, and camels (unlike southern Maasai, Samburu also keep camels "
        "due to their arid environment).\n"
        "- The nkang (homestead) system similar to the Maasai enkang.\n"
        "- Elaborate beadwork traditions — Samburu beadwork is famous for its vivid colors and complex patterns, particularly "
        "the large flat necklaces worn by women.\n"
        "- The lmuget ceremony (equivalent to some Maasai ceremonies) and the age-set system.\n"
        "- Warriors (lmurran) with long ochre-stained hair who protect herds from predators and raid neighboring groups.\n"
        "- A strong oral tradition of songs, stories, and proverbs shared with but distinct from Maasai proper.\n"
        "The Lmomonyot/Samburu represent the northern branch of Maa-speaking pastoral peoples.",
        "culture"
    ),
    make_qa(
        "What is the Maasai enkang and how is it organized?",
        "The enkang (homestead compound) is the basic living unit of Maasai social life. Structure:\n"
        "- Shape: Circular or oval, surrounded by an olale (thornbush fence) to protect livestock from predators.\n"
        "- Houses: Inside the fence, individual enkajijik (houses, singular: enkaji) are arranged in a circle around the "
        "central cattle pen.\n"
        "- Construction: Women build the houses using a framework of wooden poles covered with a mixture of mud, cow dung, "
        "grass, and urine. The dung acts as waterproofing.\n"
        "- Layout: Each house has a central hearth (enkiok), sleeping areas for the family, and a small pen for young calves.\n"
        "- Social: Each enkang typically houses an extended family — a senior elder, his wives (each with her own enkaji), "
        "their children, and sometimes married sons.\n"
        "- Cattle pen: The heart of the enkang. Cattle are brought in at night for protection.\n"
        "- Gate: The entrance faces a specific direction based on the oloiboni's guidance.\n"
        "- Movement: Enkang'itie (plural) are semi-permanent. The community moves when grazing is depleted, building new "
        "ones at the next site.\n"
        "The enkang represents the Maasai ideal: family, cattle, and community living in harmony.",
        "culture"
    ),
    make_qa(
        "What are the key Maasai ceremonies?",
        "The Maasai have a rich ceremonial life marking every major life transition:\n\n"
        "1. Enkipaata (pre-circumcision): Boys travel between enkang'itie gathering age-mates. Marks the beginning of "
        "age-set formation.\n\n"
        "2. Emuratta (circumcision): The most critical rite of passage for boys. Performed without anesthesia. The boy must "
        "not show pain — flinching brings shame. Successful completion transforms boys into ilmurran (warriors).\n\n"
        "3. Warrior period (approx. 15 years): Warriors live together in emanyatta (warrior villages), protect livestock, "
        "learn survival skills, and hold olpul (bush meat feasts).\n\n"
        "4. Eunoto (warrior graduation): Warriors transition to junior elders. Mothers shave sons' warrior hair. Deeply "
        "emotional ceremony.\n\n"
        "5. Olngesher (senior elder promotion): Junior elders become senior elders with full decision-making authority.\n\n"
        "6. Enkang oo-nkiri (marriage ceremony): Involves bride-price negotiation, blessings from both families, and the "
        "building of a new enkaji.\n\n"
        "7. Naming ceremonies: Children receive names based on circumstances of birth, weather, or events.\n\n"
        "8. Blessing ceremonies: Elders bless warriors before raids or travels, cattle before migration, and families "
        "before major decisions.\n\n"
        "9. Prayer at Ol Doinyo Lengai: During drought, delegations travel to the Mountain of God.",
        "ceremony"
    ),
    make_qa(
        "What are the Maasai beadwork colors and their meanings?",
        "Maasai beadwork (osinka) is a defining art form with each color carrying specific cultural meaning:\n"
        "- Red: Bravery, strength, unity, blood (especially of cattle). The most iconic Maasai color.\n"
        "- Blue: Sky, water, energy. Represents the sky that provides rain — a gift from Enkai.\n"
        "- Green: Land, health, nourishment. Represents the grass that feeds the cattle.\n"
        "- White: Peace, purity, health. Used in ceremonial contexts.\n"
        "- Orange: Hospitality, warmth, friendship. Represents the warmth of community.\n"
        "- Yellow: Fertility, growth, sun. Represents the life-giving sun.\n"
        "- Black: The people, solidarity, hardship. Also associated with rain clouds (thus blessing).\n\n"
        "Different patterns and combinations are used for different age groups, genders, and occasions. "
        "Married women wear specific patterns different from unmarried girls. Warriors wear distinctive "
        "beaded ornaments. Each Maasai section may have slightly different beadwork traditions.\n"
        "Women create the beadwork and pass down patterns through generations. Beadwork is also used "
        "in courtship — a girl may give beaded jewelry to the warrior she admires.",
        "culture"
    ),
    make_qa(
        "How do the Maasai view the relationship between humans and nature?",
        "The Maasai worldview is deeply integrated with nature:\n"
        "- Land stewardship: Land is not 'owned' — it is shared and managed collectively. The saying 'meeta enkop oo "
        "ltung'ani' (no land belongs to one person) captures this.\n"
        "- Rotational grazing: The olkeri (dry season pasture) and olorere (wet season pasture) system represents centuries "
        "of sophisticated land management. Overgrazing one area is avoided by moving herds seasonally.\n"
        "- Wildlife coexistence: While Maasai protect their cattle from predators, they have traditionally coexisted with "
        "wildlife. Lions are respected — killing a lion was a warrior's ultimate test of bravery, not sport.\n"
        "- Rain as divine gift: Rain (olchani) is Enkai's blessing. Drought is a sign of divine displeasure.\n"
        "- Trees: Specific trees have cultural significance. The fig tree (oreteti) is sacred — associated with the story "
        "of cattle descending from heaven. Trees provide medicine, shade for council meetings, and ceremony sites.\n"
        "- Stars and seasons: Maasai traditionally navigate by stars and predict weather from natural signs.\n"
        "- Conservation ethic: The Maasai philosophy of using only what is needed from nature has been recognized as a form "
        "of indigenous conservation that predates modern environmentalism by centuries.",
        "environment"
    ),
]

# ============================================================================
# EXTENDED BILINGUAL PAIRS — Deep vocabulary, grammar, conversational
# ============================================================================
EXTENDED_BILINGUAL = [
    # --- Deep Greetings & Conversational ---
    ("How are the children?", "Eata inkera?", "greetings"),
    ("The children are healthy.", "Inkera eata sidai.", "greetings"),
    ("Where are you going?", "Kai ilo?", "greetings"),
    ("I am going to the market.", "Alo olkejuado.", "greetings"),
    ("Come and eat with us.", "Ibu endaa nimiriki.", "greetings"),
    ("Stay well, my friend.", "Tung'a sidai, ilajani.", "greetings"),
    ("May God bless you.", "Meishoo Enkai.", "greetings"),
    ("How are the cattle today?", "Eata inkishu taata?", "greetings"),
    ("The cattle are strong and healthy.", "Inkishu eidim ne sidai.", "greetings"),
    ("What is your name?", "Kai enkaraki lino?", "greetings"),
    ("My name is Lekishon.", "Enkaraki enye Lekishon.", "greetings"),
    ("Which age-set do you belong to?", "Kai olporror lino?", "greetings"),
    
    # --- Philosophy & Wisdom ---
    ("The land does not belong to us; we belong to the land.", "Meeta enkop eiyie; eiyie ake en enkop.", "philosophy"),
    ("A wise person listens before speaking.", "Olee neitu eidim enkutuk.", "philosophy"),
    ("Children are the wealth of tomorrow.", "Inkera ake nanyore en taata.", "philosophy"),
    ("Without rain, there is no life.", "Meeta olchani, meeta enkishui.", "philosophy"),
    ("The community is stronger than any one person.", "Olosho eidim olee nabo.", "philosophy"),
    ("To forget your ancestors is to be a stream without a source.", "Meibor iloshon lino ake enkolong meeta enkare.", "philosophy"),
    ("A blessing from an elder is worth more than gold.", "Olelem en olpayian eidim nanyore.", "philosophy"),
    
    # --- Livestock (deep vocabulary) ---
    ("The spotted cow gives the sweetest milk.", "Enkiruoto naata kule sidai.", "livestock"),
    ("We must vaccinate the calves against disease.", "Kitoŋ inkera en inkishu le naibor.", "livestock"),
    ("The shepherd knows every animal by name.", "Olchiloi eidim inkishu oleng.", "livestock"),
    ("Count the cattle before nightfall.", "Inoto inkishu netii ewarie.", "livestock"),
    ("The fat-tailed sheep are fattened for the ceremony.", "Inkerry naata naleŋ le oloorika.", "livestock"),
    ("This bull has strong bloodlines.", "Olkiteng nee eidim enkoitoi.", "livestock"),
    ("Take the young calves inside the house at night.", "Idol inkera en inkishu enkaji ewarie.", "livestock"),
    
    # --- Environment & Geography ---
    ("The Maasai Mara is rich with wildlife.", "Ilmaasai Mara eidim ilowuarak.", "environment"),
    ("The escarpment rises above the valley.", "Oloololo eidim esoita.", "environment"),
    ("We will move to better pastures when the dry season comes.", "Ikilo olorere sidai netii olameyu.", "environment"),
    ("The acacia tree provides shade for the council.", "Oreteti ake olari en enkiama.", "environment"),
    ("The hot springs are near the mountain.", "Olkaria ia ol-doinyo.", "environment"),
    ("Lake Natron is sacred to the flamingos and the Maasai.", "Osero Natron ake nanyore.", "environment"),
    ("The Great Rift Valley stretches across our land.", "Oldaraki kitok ake en enkop eiyie.", "environment"),
    
    # --- Ceremonies (detailed) ---
    ("The oloiboni will perform the blessing at dawn.", "Oloiboni ake olelem enkolooŋ.", "ceremony"),
    ("The warriors danced all night before the ceremony.", "Ilmurran ia olalem ewarie oleng ne oloorika.", "ceremony"),
    ("She is preparing the calabash for the fermented milk offering.", "Intoyie eidurru olmusei le osarua.", "ceremony"),
    ("The elders sat in a circle under the tree.", "Ilpayiani eidurru oreteti.", "ceremony"),
    ("After emuratta, the boy becomes a warrior.", "Emuratta aku olaiyioni ne olmurrani.", "ceremony"),
    ("The bride's family received fifty cattle.", "Enkitok enkerai ake inkishu imiet tomon.", "ceremony"),
    
    # --- Education ---  
    ("The school is three hours' walk from here.", "Enkisoma ake okuni saa entoki.", "education"),
    ("My daughter wants to become a doctor.", "Entito enye ikilikuano olpiroi kitok.", "education"),
    ("We need teachers who speak both Maa and English.", "Ikilikuano iltiankali ne enkutuk oo lMaa nabo English.", "education"),
    ("The elders teach the young ones our history.", "Ilpayiani eidaŋat inkera olesere eiyie.", "education"),
    ("Knowledge of the land is the most important education.", "Enkoitoi en enkop ake enkisoma kitok.", "education"),
    
    # --- Health ---
    ("The healer knows the medicinal plants.", "Oloiboni eidim ilkeek en olpiroi.", "health"),
    ("Malaria is common during the rainy season.", "Olameyu naina olchani.", "health"),
    ("We need clean water for the children.", "Ikilikuano enkare sidai le inkera.", "health"),
    ("The mother is giving birth.", "Yeyo ake neshuki.", "health"),
    ("Traditional and modern medicine can work together.", "Olpiroi en kuna nabo olpiroi en taata neitu.", "health"),
    
    # --- Daily life (extended) ---
    ("Wake up, the sun is rising.", "Ibu, enkolooŋ eaku.", "daily_life"),
    ("The women are carrying water from the river.", "Intoyie ia enkare en enkolong.", "daily_life"),
    ("We will rest under the tree during the heat.", "Kidurru oreteti en enkolooŋ.", "daily_life"),
    ("Light the fire for cooking.", "Ira enkiok le endaa.", "daily_life"),
    ("The moon is full tonight.", "Olapa naata ewarie.", "daily_life"),
    ("Tell the children a story before they sleep.", "Idaŋat inkera olesere netii olam.", "daily_life"),
    ("The wind is blowing from the north.", "Olkejuk ake nemeeta.", "daily_life"),
    ("We traded goats at the market today.", "Ikishupuk imeit olkejuado taata.", "daily_life"),
    ("The honey is ready to harvest.", "Oloirien ake.", "daily_life"),
    ("My grandmother told me this story.", "Koko enye eidaŋat olesere nee.", "daily_life"),
]


# ============================================================================
# GRAMMAR INSTRUCTION PAIRS (teach the model Maa grammar patterns)
# ============================================================================
GRAMMAR_PAIRS = [
    make_qa(
        "How do you form the present tense in Maa?",
        "In Maa (Maasai language), the present tense covers habitual and ongoing actions. Verb forms indicate subject person "
        "and number. Example: 'Aidim' (I drink), 'Aidim olpayian' (The elder drinks). The verb comes first (VSO order). "
        "Subject person is marked by prefixes: a- (1st singular), i- (2nd singular), e- (3rd singular).",
        "education"
    ),
    make_qa(
        "What is vowel harmony in the Maa language?",
        "Maa uses Advanced Tongue Root (ATR) vowel harmony. Vowels are grouped into +ATR (i, e, u, o, a) and -ATR (ɪ, ɛ, ʊ, "
        "ɔ, a). Within a word, all vowels must agree in their ATR quality. For example, if a word root has +ATR vowels, all "
        "affixes must also use +ATR vowels. This is one of the most distinctive features of Maa morphophonology.",
        "education"
    ),
    make_qa(
        "How does the Maasai number system work?",
        "Maasai numbers (1-10): nabo (1), are (2), okuni (3), oonguan (4), imiet (5), ile (6), naapishana (7), isiet (8), "
        "naudo (9), tomon (10). For numbers above 10, compounding is used: tomon o nabo (11, ten and one), tomon o are (12), "
        "and so on. Tikitam (20), osom (30), artam (40), imiet tomon (50). Ip (100).",
        "education"
    ),
    make_qa(
        "How do Maasai greetings work?",
        "Maasai greetings are age and gender-specific:\n"
        "- To a warrior (olmurrani): 'Supa!' — Response: 'Epa!' or 'Ipa!'\n"
        "- To an elder (olpayian): 'Supat olpayian!' — Response: 'Epa, supat!'\n"
        "- To a woman: 'Takwenya!' — Response: 'Iko!'\n"
        "- To a child: 'Supa enkerai!' — Response: 'Epa!'\n"
        "- 'Kasserian ingera?' (How are the children?) is a traditional wellness check.\n"
        "- Response: 'Sapati ingera' (The children are well).\n"
        "Greetings involve touch — shaking hands, and sometimes a light head-bow for elders.",
        "greetings"
    ),
]


def main() -> None:
    output_path = Path("data/raw/maasai_knowledge_corpus.jsonl")
    
    all_records: list[dict] = []
    
    # Folk stories
    all_records.extend(FOLK_STORIES)
    
    # Proverbs (as bilingual + explanation records)
    for mas_proverb, en_translation, explanation in PROVERBS:
        # Bilingual pair
        all_records.extend(make_bilingual(en_translation, mas_proverb, "proverbs"))
        # Explanation record
        all_records.append(make_qa(
            f"What does the Maasai proverb '{mas_proverb}' mean?",
            f"The Maasai proverb '{mas_proverb}' translates to '{en_translation}'. {explanation}",
            "proverbs"
        ))
    
    # Cultural Q&A
    all_records.extend(CULTURAL_QA)
    
    # Extended bilingual pairs
    for en, mas, domain in EXTENDED_BILINGUAL:
        all_records.extend(make_bilingual(en, mas, domain))
    
    # Grammar instruction pairs
    all_records.extend(GRAMMAR_PAIRS)
    
    write_records(all_records, output_path)
    
    # Stats
    from collections import Counter
    domain_counts = Counter(r.get("domain", "unknown") for r in all_records)
    source_counts = Counter(r.get("source_name", "unknown") for r in all_records)
    
    print(f"Generated {len(all_records)} total records")
    print(f"Output: {output_path}")
    print(f"\nBy domain:")
    for domain, count in domain_counts.most_common():
        print(f"  {domain}: {count}")
    print(f"\nBy source type:")
    for source, count in source_counts.most_common():
        print(f"  {source}: {count}")


if __name__ == "__main__":
    main()
