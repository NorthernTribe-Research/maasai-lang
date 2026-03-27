#!/usr/bin/env python3
"""
Generate nkatini (folk tales), oyete (riddles), and modern Maasai stories.

Nkatini = traditional folk tales told by elders, usually around the fire
Oyete = riddles and brain teasers exchanged among community members
Modern stories = contemporary Maasai narratives bridging tradition and modern world

Output: data/raw/nkatini_oyete_modern.jsonl
"""

from __future__ import annotations

import json
from pathlib import Path


def write_records(records: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def make_record(question: str, answer: str, domain: str, source: str = "nkatini_oyete") -> dict:
    return {
        "source_text": question,
        "target_text": answer,
        "source_lang": "en",
        "target_lang": "en",
        "domain": domain,
        "source_name": source,
        "quality_score": 1.0,
        "notes": f"Maasai {domain} for deep cultural understanding",
    }


def make_bilingual(en: str, mas: str, domain: str, source: str = "nkatini_oyete") -> list[dict]:
    return [
        {"source_text": en, "target_text": mas, "source_lang": "en", "target_lang": "mas",
         "domain": domain, "source_name": source, "quality_score": 1.0, "notes": ""},
        {"source_text": mas, "target_text": en, "source_lang": "mas", "target_lang": "en",
         "domain": domain, "source_name": source, "quality_score": 1.0, "notes": ""},
    ]


# ============================================================================
# NKATINI — Traditional Folk Tales
# ============================================================================
NKATINI = [
    make_record(
        "Tell me a nkatini about the hare and the hyena.",
        "Nkatini oo Olowuaru-keri nabo Oloibor-keju:\n\n"
        "Long ago, the Hare and the Hyena were friends. One dry season, they found a single pot of honey "
        "hidden in a baobab tree. 'Let us share it equally,' said the Hare. But the Hyena was greedy. "
        "'I am bigger. I should have more,' the Hyena said. The Hare thought carefully. 'Let us have a "
        "contest. Whoever can stay awake all night shall have the larger share.' The Hyena agreed, "
        "confident in his strength. That night, the Hare told story after story, keeping the Hyena "
        "entertained. But secretly, the Hare had placed sweet berries near the Hyena's nose. The scent "
        "made the Hyena drowsy, and by midnight, the Hyena was fast asleep, snoring like thunder. "
        "The Hare ate the honey, leaving only a tiny drop for the Hyena. When morning came, the Hyena "
        "woke to find the empty pot. 'You cheated!' he cried. 'No,' said the Hare. 'I simply used my "
        "mind while you relied on your size. Wisdom, not strength, wins the prize.'\n\n"
        "Enaitoti (Moral): Intelligence and cunning are more valuable than brute force. This nkatini "
        "teaches children that thinking is the greatest weapon.",
        "nkatini"
    ),
    make_record(
        "Tell me a nkatini about why the tortoise carries its house.",
        "Nkatini oo Olonyok (The Tortoise):\n\n"
        "In the days when animals could speak, the Tortoise was invited to a great feast at Enkai's "
        "home in the sky. All the birds were flying up, and the Tortoise begged them for help. "
        "Each bird gave the Tortoise a feather, and with these borrowed feathers, the Tortoise flew "
        "to the feast. At the feast, the Tortoise ate greedily, more than anyone else. When it was "
        "time to return, the birds were angry and took back their feathers. The Tortoise was stranded "
        "in the sky. 'Jump!' called the birds cruelly. The Tortoise had no choice. He jumped and "
        "crashed to the earth, shattering his smooth shell into many pieces. Enkai took pity on the "
        "Tortoise and patched the shell back together, but it was never smooth again — that is why "
        "the tortoise's shell has many patterns today. And because the fall hurt so much, the Tortoise "
        "decided to always carry his house on his back, so he would never be far from safety again.\n\n"
        "Enaitoti: Greed leads to suffering. Borrowed strength is never reliable.",
        "nkatini"
    ),
    make_record(
        "Tell me a nkatini about a brave Maasai girl.",
        "Nkatini oo Naisiae (The Brave Girl):\n\n"
        "There was a girl named Naisiae in an enkang near the great plains. While the warriors were "
        "away at an olpul (meat feast), a lion came to the enkang at night. The olale (thornbush fence) "
        "had a gap where a branch had fallen. The lion crept through the gap toward the calves. "
        "Naisiae heard the calves crying and knew something was wrong. Her mother told her to stay "
        "inside, but Naisiae took her father's rungu (club) and a burning stick from the enkiok (fire). "
        "She ran to the gap in the fence and stood before the lion, waving the fire. The lion, startled "
        "by the flames and the girl's fearless shouts, retreated into the darkness. Naisiae repaired "
        "the fence with thorns and guarded the gap until dawn. When the warriors returned and heard "
        "what happened, the olaiguenani (spokesperson) stood before the community and said: 'This girl "
        "has the heart of an olmurrani. Let no one say that bravery belongs only to men.'\n\n"
        "Enaitoti: Courage is not determined by gender. Protecting the community is everyone's duty.",
        "nkatini"
    ),
    make_record(
        "Tell me a nkatini about two brothers and the drought.",
        "Nkatini oo Ilaiyiok are (Two Brothers):\n\n"
        "Two brothers lived in the same enkang. The elder brother, Parsitau, was wealthy with many "
        "cattle. The younger brother, Lekishon, had only a few goats. When a terrible drought came, "
        "Parsitau's cattle began to die because he had too many for the remaining pasture. He refused "
        "to share his remaining grass with anyone. Lekishon, with his smaller herd, moved to a hidden "
        "valley he had discovered while walking the land. He found water and grass there, enough for "
        "his goats and more. Lekishon sent word to the whole enkang, including Parsitau, inviting them "
        "to share the valley. When the drought ended, Parsitau had lost most of his cattle to stubbornness, "
        "while Lekishon's small herd had grown. The elders said: 'Osotua (mutual obligation) saves all. "
        "Greed saves no one.' Parsitau learned that sharing in hard times builds wealth that selfishness "
        "destroys.\n\n"
        "Enaitoti: Generosity and knowledge of the land are greater wealth than the size of your herd.",
        "nkatini"
    ),
    make_record(
        "Tell me a nkatini about the stars.",
        "Nkatini oo Iloonito (The Stars):\n\n"
        "When Enkai created the world, the sky was completely dark at night. The Maasai could not see "
        "their cattle, and the predators hunted freely in the darkness. A mother prayed to Enkai: "
        "'Give us light in the night so we can protect our children and our cattle.' Enkai was moved "
        "by her prayer. Enkai took the sparks from the mother's cooking fire and threw them into the "
        "sky. Each spark became a star. The brightest stars were the sparks that burned the hottest — "
        "they became the guiding stars that the Maasai use for navigation. The Milky Way was the trail "
        "of sparks that scattered across the sky. 'These are your fires,' Enkai said. 'I have carried "
        "your hearth into the heavens so that you will never be in darkness.' This is why the Maasai "
        "say the stars are the cooking fires of Enkai, watching over the people and the cattle below.\n\n"
        "Enaitoti: The prayers of a mother have the power to reach Enkai. Light always comes to those who ask.",
        "nkatini"
    ),
    make_record(
        "Tell me a nkatini about the first oloiboni.",
        "Nkatini oo Oloiboni Kitok (The First Great Oloiboni):\n\n"
        "Before there were iloibonok (spiritual leaders), the Maasai had no one to interpret the signs "
        "of Enkai. When lightning struck, they did not know if it was a blessing or a warning. When "
        "cattle fell sick, they did not know which herbs to use. Then Enkai chose a man named Kidongoi. "
        "Enkai appeared to Kidongoi in a dream and said: 'I give you the gift of seeing what others "
        "cannot see. You will read the dreams of the people. You will know which herbs heal and which "
        "harm. You will stand between me and the Maasai.' Kidongoi became the first oloiboni. He taught "
        "his sons, and they taught their sons. The lineage of the iloibonok stretches from Kidongoi "
        "through Mbatiany (the great prophet who foresaw the coming of the Europeans), to Lenana and "
        "Sendeu who led the Maasai through the colonial period. The oloiboni's enkidong (divination "
        "gourd with stones) is the sacred tool passed from father to son.\n\n"
        "Enaitoti: Sacred knowledge is a gift from Enkai that must be passed carefully to those worthy of receiving it.",
        "nkatini"
    ),
]

# ============================================================================
# OYETE — Riddles & Brain Teasers
# ============================================================================
OYETE = [
    make_record(
        "Tell me a Maasai oyete (riddle).",
        "Oyete: 'Eeta nini neme eton, kake meibelekeny?' (What has legs but cannot walk?)\n"
        "Answer: Enkaji (A house) — the house stands on its wooden poles but cannot move.\n\n"
        "This oyete teaches children to observe the world around them and think creatively about "
        "familiar objects.",
        "oyete"
    ),
    make_record(
        "Give me another Maasai riddle.",
        "Oyete: 'Eeta nini naata nabo, kake eidim iloshon oleng?' (What is one thing that "
        "can reach many sections?)\n"
        "Answer: Enkutuk (The language / a word) — one word spoken can travel across all the "
        "iloshon (Maasai sections) because the Maasai share the Maa language.\n\n"
        "This oyete emphasizes the power and reach of language as a unifying force.",
        "oyete"
    ),
    make_record(
        "What Maasai riddles do children learn?",
        "Here are traditional Maasai oyete (riddles) that children learn:\n\n"
        "1. Oyete: 'Eidim pee ewuo ne meiruk pee euu?' (What can go out but cannot come back?)\n"
        "   Answer: Enkutuk (A spoken word) — once you speak, you cannot take it back.\n\n"
        "2. Oyete: 'Eeta nini nainchoo oleng kake meinyoo enyeŋ?' (What has many eyes but cannot see?)\n"
        "   Answer: Olkiteng (A potato / tuber) — it has many 'eyes' (sprout buds) but cannot see.\n\n"
        "3. Oyete: 'Eeta nini neaku enkolooŋ ne meiruk ewarie?' (What comes in the morning but "
        "   does not return at night?)\n"
        "   Answer: Olari (Shadow) — the shadow appears with the sun but vanishes in darkness.\n\n"
        "4. Oyete: 'Eeta nini naidim oleng kake me-inyoo?' (What is very tall but has no legs?)\n"
        "   Answer: Oreteti (A tree) — it reaches for the sky but is rooted in the earth.\n\n"
        "5. Oyete: 'Nini ake naibor ewarie kake narok enkolooŋ?' (What is white at night but "
        "   black in the morning?)\n"
        "   Answer: Enkiok (The fire / embers) — glowing white-hot at night, but cold black ash by morning.\n\n"
        "Oyete teach observation, wordplay, and lateral thinking. Elders use them to test the "
        "intelligence and attentiveness of the young.",
        "oyete"
    ),
    make_record(
        "Tell me Maasai riddles about nature.",
        "Nature oyete from Maasai tradition:\n\n"
        "1. 'Eeta nini nenoŋ olchani kake menoŋ olameyu?' (What cries with the rain but is "
        "silent in drought?)\n   Answer: Enkolong (The river)\n\n"
        "2. 'Eeta nini neata enkolong kake meata enkop?' (What has a bed but never sleeps?)\n"
        "   Answer: Enkolong (The river) — it has a 'riverbed' but flows endlessly.\n\n"
        "3. 'Eeta nini neaku nemeeta kake neidurru oleng?' (What goes far but stays in one place?)\n"
        "   Answer: Embolet (The road / path) — it stretches far but never moves.\n\n"
        "4. 'Eeta nini neitu oleng kake meinyoo enkonyek?' (What sees everything but has no eyes?)\n"
        "   Answer: Enkai (God) — sees all but is not seen.\n\n"
        "These riddles train children to understand the natural world through metaphor and creative thinking.",
        "oyete"
    ),
]

# ============================================================================
# MODERN MAASAI STORIES — Bridging tradition and modern world
# ============================================================================
MODERN_STORIES = [
    make_record(
        "Tell me a modern Maasai story about education.",
        "Nkatini oo Taata (A Story of Today) — The Girl Who Became a Doctor:\n\n"
        "Naserian grew up in an enkang near Kajiado. Every morning, she walked two hours to school "
        "while her brothers stayed home with the cattle. 'Why do you want school?' her father asked. "
        "'The cattle need you.' But Naserian's mother, remembering the story of Naisiae the brave girl, "
        "spoke up: 'Let her go. Knowledge of the land is important, but knowledge of medicine saves "
        "lives too.' Naserian studied hard. She was the first in her family to finish secondary school. "
        "She won a scholarship to university in Nairobi and studied medicine. When she returned to her "
        "community as a doctor, she set up a clinic near the enkang. She treated the children who had "
        "malaria. She taught the mothers about clean water. She used both modern medicine and the "
        "traditional healing knowledge she had learned from the oloiboni. The elders, who had once "
        "doubted her path, gave her a blessing: 'You have brought the knowledge of the outside world "
        "back to your people. You have not forgotten who you are. You are still Maasai.' Naserian "
        "named her clinic 'Enkare Sidai' — Clean Water — because she learned that most illness in "
        "the community came from contaminated water sources.\n\n"
        "This story shows that modern education and traditional culture are not enemies — they strengthen each other.",
        "modern_story"
    ),
    make_record(
        "Tell me a modern Maasai story about technology.",
        "Nkatini oo Taata — The Warrior with a Phone:\n\n"
        "Lemayian was an olmurrani (warrior) who herded cattle in the Maasai Mara. One day, a tourist "
        "left behind a smartphone. Lemayian was curious. He had seen the tourists tapping the glass "
        "screens, but he had never held one. A teacher from the nearby school showed him how it worked. "
        "Lemayian discovered that he could check weather forecasts — knowing when the rains would come "
        "days in advance. He set up a WhatsApp group for his age-set, and the warriors across three "
        "different enkang'itie could now warn each other about predators, share grazing information, "
        "and coordinate cattle movements. 'This is like the old signaling system,' Lemayian told the "
        "elders, 'but faster. We used to send runners between enkang'itie. Now the message arrives before "
        "the runner could even start.' The olaiguenani agreed: 'The tool is new, but the purpose is "
        "old — to protect our cattle and our community.' Lemayian also used the phone to record the "
        "elder's stories and songs. 'If I can record Koko's (grandmother's) voice telling nkatini,' "
        "he said, 'then her stories will never be lost, even when she joins the ancestors.'\n\n"
        "This story shows that technology can serve traditional values when used wisely.",
        "modern_story"
    ),
    make_record(
        "Tell me a modern Maasai story about land conservation.",
        "Nkatini oo Taata — The Conservancy:\n\n"
        "The Isiria section near the Maasai Mara faced a crisis. Outsiders were buying up Maasai land, "
        "fencing it off, and planting crops. The cattle had less room to graze. The wildlife migration "
        "routes were being blocked. An elder named Parmuat gathered the community under the great acacia "
        "tree for an enkiama (council meeting). 'The land is not mine to sell,' he said, quoting the "
        "proverb: 'Meeta enkop oo ltung'ani' — No land belongs to one person. 'If we sell the land, "
        "where will the cattle go? Where will the wildebeest migrate? Where will our grandchildren "
        "build their enkang'itie?' The community decided to form a conservancy — a modern legal "
        "structure that protected the communal land while allowing sustainable tourism. The tourism "
        "income replaced what individuals might have earned from selling land. The wildlife returned. "
        "The cattle had grazing corridors. Young Maasai were trained as rangers and guides, earning "
        "income while protecting their heritage. 'Our ancestors managed this land for centuries without "
        "fences,' Parmuat said. 'The conservancy is just the modern way of doing what we have always "
        "done — being custodians of the earth.'\n\n"
        "This story demonstrates how traditional Maasai land ethics inform modern conservation solutions.",
        "modern_story"
    ),
    make_record(
        "Tell me a modern Maasai story about a young person preserving culture.",
        "Nkatini oo Taata — The Bead Maker's Daughter Goes Online:\n\n"
        "Naipanoi learned beadwork from her mother, who learned from her mother, going back generations. "
        "The intricate patterns — red for bravery, blue for the sky, green for the land — told stories "
        "that no outsider could read. But the young people in the enkang were losing interest. 'Why "
        "should I make beads?' her cousin asked. 'I can buy a necklace from the market in Nairobi.' "
        "Naipanoi felt the tradition slipping away. Then she had an idea. With help from a teacher, "
        "she created an Instagram account showcasing her beadwork. She photographed each piece and "
        "wrote the story behind the pattern: 'This collar is the enkiama design — it represents the "
        "circle of elders sitting under the tree. The red diamonds are the shields of the warriors. "
        "The blue lines are the rivers that sustain our cattle.' The account grew. Orders came from "
        "Nairobi, Europe, America. Other women in the enkang joined, each contributing their section's "
        "unique patterns. The income helped families. More importantly, the young girls who had ignored "
        "beadwork now wanted to learn — they saw that their tradition had value in the modern world. "
        "Naipanoi's mother said: 'The patterns were always valuable. The world just needed to see them.'\n\n"
        "This story shows that culture does not have to be frozen in the past — it can thrive in new forms.",
        "modern_story"
    ),
    make_record(
        "Tell me a modern Maasai story about climate change.",
        "Nkatini oo Taata — When the Seasons Changed:\n\n"
        "The elders of the Ilkaputiei section noticed something troubling. The rainy seasons that their "
        "ancestors had predicted for generations were no longer arriving on time. The olkeri (dry season "
        "pastures) were drying up faster. The rivers that had never gone dry in living memory were "
        "becoming seasonal. 'Enkai Nanyokie is angry,' some said. But a young woman named Saningo, "
        "who had studied environmental science at university, returned home with a different explanation. "
        "'The whole world's weather is changing,' she told the enkiama. 'It is not just us. The factories "
        "and cars far away are heating the air, and it changes the rain patterns everywhere.' The elders "
        "listened. 'What do we do?' asked the olaiguenani. Saningo proposed combining traditional "
        "knowledge with modern science. The elders knew which grass species survived drought best — she "
        "helped plant those grasses in degraded areas. The elders knew where underground water sources "
        "lay — she helped dig solar-powered boreholes there. Together, they mapped the seasonal routes "
        "that cattle had followed for centuries and identified which routes were still viable as the "
        "climate shifted. 'Our ancestors adapted when the seasons changed before,' said Parmuat. 'We "
        "will adapt again. But this time, we have both the old knowledge and the new.'\n\n"
        "This story demonstrates that Maasai resilience — the ability to adapt — is their greatest strength.",
        "modern_story"
    ),
    make_record(
        "Tell me a modern Maasai story about language preservation.",
        "Nkatini oo Taata — Saving Enkutuk oo lMaa (The Maa Language):\n\n"
        "In a town near Narok, the children were speaking more Swahili and English than Maa. The elders "
        "gathered and expressed concern. 'Enkutuk oo lMaa — the Maa language — is the voice of our "
        "ancestors,' said the oldest olpayian. 'If the children stop speaking it, who will understand "
        "the prayers? Who will tell the nkatini? Who will sing the songs at eunoto?' A young teacher "
        "named Senteu proposed a solution. He worked with university researchers to create a Maa language "
        "app. The app taught vocabulary through games, used voice recording to practice pronunciation, "
        "and included recordings of elders telling nkatini and singing traditional songs. But Senteu "
        "knew the app alone was not enough. He started a community program where elders spent time "
        "each week telling stories to children — in Maa only. The children who learned the most Maa "
        "vocabulary each month received a special beaded bracelet made by the grandmothers. Within a "
        "year, the children were speaking Maa again — at home, at play, even at school. They could "
        "recite proverbs, solve oyete (riddles), and tell nkatini to their younger siblings. 'The "
        "language is alive again,' Senteu told the enkiama. 'Not because of the app — because of "
        "the elders who spoke it with love, and the children who heard it with wonder.'\n\n"
        "This story shows that language preservation requires both modern tools and living human connection.",
        "modern_story"
    ),
]

# ============================================================================
# NKATINI/OYETE BILINGUAL PAIRS
# ============================================================================
NKATINI_BILINGUAL = [
    ("Tell me a folk tale.", "Idaŋat nkatini.", "nkatini"),
    ("Tell me a riddle.", "Idaŋat oyete.", "oyete"),
    ("What is the moral of the story?", "Kai enaitoti en nkatini?", "nkatini"),
    ("The story teaches us about wisdom.", "Nkatini eidaŋat enkoitoi.", "nkatini"),
    ("Grandmother, tell us a story.", "Koko, idaŋat nkatini.", "nkatini"),
    ("We sat around the fire and listened to stories.", "Kidurru enkiok ne nkirishio nkatini.", "nkatini"),
    ("The riddle is difficult to solve.", "Oyete nee ake eidim.", "oyete"),
    ("I know the answer to the riddle.", "Aidim oyete.", "oyete"),
    ("The hare is clever in Maasai stories.", "Olowuaru-keri ake neitu en nkatini.", "nkatini"),
    ("Stories keep our culture alive.", "Nkatini ake kitoŋ oloshon eiyie.", "nkatini"),
    ("Let me tell you a story from long ago.", "Idaŋat nkatini en taata.", "nkatini"),
    ("The children love hearing riddles.", "Inkera ia oyete oleng.", "oyete"),
    ("Every story has a lesson.", "Nkatini oleng ake enaitoti.", "nkatini"),
    ("Modern stories also teach us important lessons.", "Nkatini en taata ake eidaŋat enaitoti.", "modern_story"),
    ("Our stories connect the past to the future.", "Nkatini eiyie ake eidurru taata nabo otii.", "nkatini"),
]


def main() -> None:
    output_path = Path("data/raw/nkatini_oyete_modern.jsonl")
    
    all_records: list[dict] = []
    
    # Nkatini (folk tales)
    all_records.extend(NKATINI)
    
    # Oyete (riddles)
    all_records.extend(OYETE)
    
    # Modern stories
    all_records.extend(MODERN_STORIES)
    
    # Bilingual pairs
    for en, mas, domain in NKATINI_BILINGUAL:
        all_records.extend(make_bilingual(en, mas, domain))
    
    write_records(all_records, output_path)
    
    from collections import Counter
    domain_counts = Counter(r.get("domain", "unknown") for r in all_records)
    source_counts = Counter(r.get("source_name", "unknown") for r in all_records)
    
    print(f"Generated {len(all_records)} total records")
    print(f"Output: {output_path}")
    print(f"\nBy domain:")
    for domain, count in domain_counts.most_common():
        print(f"  {domain}: {count}")


if __name__ == "__main__":
    main()
