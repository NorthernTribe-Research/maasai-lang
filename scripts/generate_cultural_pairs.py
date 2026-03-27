#!/usr/bin/env python3
"""
Generate culturally rich English <-> Maasai parallel training pairs.

This script creates high-quality instruction-tuning data reflecting:
- Maasai philosophy (Enkai, osotua, enkanyit)
- Sub-tribe references (Ldikiri, Laikipiak, Samburu/Lmomonyot, Ilkisongo, Ilpurko, etc.)
- Ceremonies (e-unoto, emuratta, enkipaata)
- Daily life, livestock, environment, education, health
- Greetings and conversational Maa

Output: data/raw/cultural_pairs.jsonl
"""

from __future__ import annotations

import json
from pathlib import Path


# ============================================================================
# PARALLEL SENTENCE PAIRS
# Each tuple: (English, Maasai, domain)
# These represent natural local-dialect translations.
# ============================================================================

CULTURAL_PAIRS = [
    # --- Greetings ---
    ("Hello, how are you?", "Supa, ipa eata?", "greetings"),
    ("I am fine.", "Sidai.", "greetings"),
    ("Good morning, elder.", "Supat enkolooŋ, olpayian.", "greetings"),
    ("Thank you very much.", "Ashe oleng.", "greetings"),
    ("Welcome to our home.", "Karibu enkang eiyie.", "greetings"),
    ("How is the family?", "Eata inkera?", "greetings"),
    ("The family is well.", "Inkera sidai.", "greetings"),
    ("Peace be with you.", "Osilalei eng'eno.", "greetings"),
    ("Goodbye, go well.", "Serian, lotu sidai.", "greetings"),
    ("Good evening.", "Supat enyama.", "greetings"),

    # --- Philosophy & Spirituality ---
    ("God has blessed us with rain.", "Enkai eaku olchani.", "philosophy"),
    ("God gave cattle to the Maasai.", "Enkai eaku inkishu Ilmaasai.", "philosophy"),
    ("We pray to Enkai for the well-being of our cattle.", "Kidol Enkai nabo inkishu.", "philosophy"),
    ("Respect for elders is the foundation of our culture.", "Enkanyit en ilpayiani ake enyamal en oloshon.", "philosophy"),
    ("Osotua is a sacred bond of mutual obligation.", "Osotua ake osotua nanyok.", "philosophy"),
    ("The oloiboni interpreted the dreams of the community.", "Oloiboni eidaŋat ilorien le olosho.", "philosophy"),
    ("An elder's blessing brings prosperity.", "Olelem en olpayian eaku nanyore.", "philosophy"),
    ("The Mountain of God watches over the Maasai.", "Ol Doinyo Lengai eidim Ilmaasai.", "philosophy"),
    ("Peace is more important than victory.", "Osilalei eidim oltureshi.", "philosophy"),
    ("Wisdom comes with age.", "Enkoitoi eitu le rishata.", "philosophy"),

    # --- Livestock ---
    ("Where are the cattle?", "Kai inkishu?", "livestock"),
    ("The cattle are grazing in the field.", "Inkishu ia arishata.", "livestock"),
    ("The bull is strong.", "Olkiteng eidim.", "livestock"),
    ("We need to move the livestock to fresh pasture.", "Ikilikuano inkishu olorere.", "livestock"),
    ("The goats need water.", "Imeit ikilikuano enkare.", "livestock"),
    ("How many sheep do we have?", "Adia inkerry?", "livestock"),
    ("The heifer will give birth soon.", "Enkirukoto neshuki.", "livestock"),
    ("Protect the calves from predators.", "Kitoŋ inkera en inkishu.", "livestock"),
    ("The cows are giving good milk.", "Inkishu ia kule sidai.", "livestock"),
    ("We lost two donkeys last night.", "Ikimeshoki olmotoni are ewarie.", "livestock"),

    # --- Culture & Ceremonies ---
    ("The warriors are performing a traditional dance.", "Ilmurran ia olalem.", "ceremony"),
    ("The e-unoto ceremony marks the transition from warrior to elder.", "E-unoto ake oloorika en ildamat en ilmurran ne ilpayiani.", "ceremony"),
    ("The circumcision ceremony makes boys into warriors.", "Emuratta ake enyamal ilaiyiok ne ilmurran.", "ceremony"),
    ("The enkipaata brings together boys before circumcision.", "Enkipaata eidurru ilaiyiok netii emuratta.", "ceremony"),
    ("Our beadwork tells the story of our people.", "Osinka eiyie eidaŋat olesere en Ilmaasai.", "culture"),
    ("The red shuka is worn with pride.", "Shuka nanyokie ake enkanyit.", "culture"),
    ("Maasai women build the houses.", "Intoyie en Ilmaasai ia inkajijik.", "culture"),
    ("We gather under the great tree for the council meeting.", "Kidurru oreteti kitok ne enkiama.", "governance"),
    ("The olaiguenani speaks for the community.", "Olaiguenani eidaŋat le olosho.", "governance"),
    ("The age-set system organizes our society.", "Ilporror ake enyamal en Ilmaasai.", "governance"),

    # --- Sub-tribe Specific ---
    ("The Laikipiak were great warriors of the Laikipia plateau.", "Laikipiak ake ilmurran kitok le Laikipia.", "culture"),
    ("The Samburu people share the Maa language with the Maasai.", "Samburu eidaŋat enkutuk oo lMaa nabo Ilmaasai.", "culture"),
    ("The Lmomonyot are the people of the northern rangelands.", "Lmomonyot ake Ilmaasai en enkop nemeeta.", "culture"),
    ("The Ldikiri section maintains its unique traditions.", "Ldikiri olosho ake oloshon le inkutuk.", "culture"),
    ("The Ilkisongo are the largest section in Tanzania.", "Ilkisongo ake olosho kitok en Tanzania.", "culture"),
    ("The Ilpurko dialect is considered the standard form of Maa.", "Enkutuk en Ilpurko ake enkutuk oo lMaa kitok.", "culture"),
    ("The Ilparakuyo are pastoral Maasai in eastern Tanzania.", "Ilparakuyo ake Ilmaasai en Tanzania.", "culture"),
    ("The Ilarusa live near Mount Meru.", "Ilarusa ia Ol Doinyo Meru.", "culture"),
    ("The Isiria section lives near the Maasai Mara.", "Isiria ia Ilmaasai Mara.", "culture"),
    ("The Ilkeekonyokie live near the Ngong Hills.", "Ilkeekonyokie ia esoit en Ngong.", "culture"),

    # --- Environment & Land ---
    ("This land belongs to the Maasai.", "Enkop nee ake Ilmaasai.", "environment"),
    ("The rains have come and the grass is green.", "Olchani eaku ne esiaai naidim.", "environment"),
    ("We need to protect the forest.", "Kitoŋ oreteti.", "environment"),
    ("The river is dry because of the drought.", "Enkolong ake tara ne ina olameyu.", "environment"),
    ("The Maasai Mara is our ancestral land.", "Ilmaasai Mara ake enkop en kitoshoto.", "environment"),
    ("Cold water flows from the hills.", "Enkare Nairobi eaku esoit.", "environment"),
    ("The mountain is sacred to our people.", "Ol-doinyo ake nanyore en Ilmaasai.", "environment"),
    ("Wild animals share the land with our cattle.", "Ilowuarak eidurru enkop nabo inkishu.", "environment"),

    # --- Education ---
    ("The children are going to school.", "Inkera ia enkisoma.", "education"),
    ("Education is important for our future.", "Enkisoma aidim le taata.", "education"),
    ("The teacher is teaching the children Maasai history.", "Oltiankali eidaŋat inkera olesere en Ilmaasai.", "education"),
    ("We must preserve our language for future generations.", "Kitoŋ enkutuk oo lMaa le inkera.", "education"),
    ("Both traditional knowledge and modern education matter.", "Enkoitoi en kuna nabo enkisoma naidim.", "education"),

    # --- Health ---
    ("The sick child needs medicine.", "Enkerai naibor ikilikuano olpiroi.", "health"),
    ("Traditional medicine uses herbs from the forest.", "Olpiroi en kuna ake ilkeek en oreteti.", "health"),
    ("Clean water prevents disease.", "Enkare sidai eitu naibor.", "health"),
    ("The oloiboni knows which plants heal.", "Oloiboni eidim ilkeek nanyore.", "health"),
    ("Take the patient to the clinic.", "Lotu naibor enkisoma en olpiroi.", "health"),

    # --- Daily Life ---
    ("Please bring water.", "Amu enkare.", "daily_life"),
    ("The food is ready.", "Endaa ake.", "daily_life"),
    ("The women are milking the cows.", "Intoyie ia kule en inkishu.", "daily_life"),
    ("We drink fermented milk every morning.", "Kidong osarua enkolooŋ.", "daily_life"),
    ("The fire is burning in the hearth.", "Enkiok ia enkaji.", "daily_life"),
    ("The market is far from here.", "Olkejuado nemeeta.", "daily_life"),
    ("Let us eat together.", "Kidong endaa.", "daily_life"),
    ("The night is dark and cold.", "Ewarie ake narok ne enyama.", "daily_life"),
    ("Build a strong fence around the homestead.", "Ira olale eidim ne enkang.", "daily_life"),
    ("My mother makes the best fermented milk.", "Yeyo enye aked osarua sidai.", "daily_life"),

    # --- Kinship ---
    ("This is my mother.", "Nee yeyo enye.", "kinship"),
    ("My father is an elder.", "Papa enye ake olpayian.", "kinship"),
    ("The girls are fetching firewood.", "Intoyie ia oreteti.", "kinship"),
    ("My brother is a warrior.", "Olanye ake olmurrani.", "kinship"),
    ("The children are playing outside.", "Inkera ia oot.", "kinship"),

    # --- Proverbs & Wisdom ---
    ("One finger cannot kill a louse.", "Enyeŋ nabo mainyoo en kine.", "proverbs"),
    ("Do not start what you cannot finish.", "Meeta netii ake mekirishio.", "proverbs"),
    ("A single stick is easily broken, but a bundle is strong.", "Olorien nabo ake tara, ne ilorienik eidim.", "proverbs"),
    ("The eye that has seen does not forget.", "Enkonyek naisho maibore.", "proverbs"),
    ("He who walks with the wise becomes wise.", "Nejo le neaku ake neaku.", "proverbs"),

    # --- Numbers & Counting ---
    ("I have one cow.", "Eton inkishu nabo.", "numbers"),
    ("There are two children.", "Eton inkera are.", "numbers"),
    ("We have ten goats.", "Eton imeit tomon.", "numbers"),
    ("Three warriors came to the meeting.", "Ilmurran okuni eitu enkiama.", "numbers"),
    ("Give me five.", "Inion imiet.", "numbers"),

    # --- PHILOSOPHY & SPIRITUALITY - ENHANCED ---
    # Proverbs and wisdom
    ("One finger cannot kill a louse.", "Enyeŋ nabo mainyoo en kine.", "philosophy"),
    ("A single stick is easily broken, but a bundle is strong.", "Olorien nabo ake tara, ne ilorienik eidim.", "philosophy"),
    ("He who walks with the wise becomes wise.", "Nejo le neaku ake neaku.", "philosophy"),
    ("The eye that has seen does not forget.", "Enkonyek naisho maibore.", "philosophy"),
    ("Do not start what you cannot finish.", "Meeta netii ake mekirishio.", "philosophy"),
    ("Patience is the mother of all wisdom.", "Enkanyit en Enkai ake nosho.", "philosophy"),
    ("A journey of a thousand miles begins with a single step.", "Olturesh en sapuk ake ata onyeŋ nabo.", "philosophy"),
    ("Better late than never.", "Sidai to meeta.", "philosophy"),
    ("The strongest tree is not always the tallest.", "Oreteti eidim ake en enka olloibor.", "philosophy"),
    ("In unity there is strength.", "Oolkinya ake enkanyit.", "philosophy"),
    ("An honest tongue is better than gold.", "Enkutuk en sidai ake aidim to olokui.", "philosophy"),
    ("The wise farmer plants several seeds.", "Oloron enye ake ira ilelek.", "philosophy"),
    ("What an old person sees sitting, a young person cannot see standing.", "Olpayian naidim ne enkolooŋ ake olaiyo maiwoto.", "philosophy"),
    ("Fire and water are friends only outside.", "Enkiok ne enkare ake sibarani oo meta.", "philosophy"),
    ("A person without dreams is like a tree without roots.", "Oleshanda meeta nabo ake oreteti meeta olakerero.", "philosophy"),
    ("Respect is earned, not inherited.", "Enkanyit ake naidim meeta olpayian.", "philosophy"),
    ("The mouth that speaks too much loses its truth.", "Enkutuk en aidim ake enkonyek nishakua.", "philosophy"),
    ("Better a known path than an unknown forest.", "Oolalos entim en sapuk ake en oreteti.", "philosophy"),
    ("Pride goes before a fall.", "Omeita ake enkolooŋ to olalashe.", "philosophy"),
    ("The river that flows is never lonely.", "Enkare itungania ake meeta enkudonit.", "philosophy"),

    # Age-set transitions and warrior philosophy
    ("A warrior who thinks only of glory will fall in battle.", "Olmurrani eidim armunye ake oidurru olalashe.", "philosophy"),
    ("The glory of a warrior fades, but the virtue of an elder endures.", "Omeita en olmurrani ake entara, ne sopa en olpayian aidim.", "philosophy"),
    ("To be a warrior is to protect those who cannot protect themselves.", "Olmurrani ake inye ole naidim olenyek.", "philosophy"),
    ("A true warrior fears Enkai, not his enemies.", "Olmurrani en sidai ake oyio Enkai, meeta olowuadee.", "philosophy"),
    ("The strength of youth must be tempered by the wisdom of age.", "Eidim en olaiyo ake naitikua na enkoitoi en olpayian.", "philosophy"),
    ("Every warrior will one day become an elder; treat elders as they treated you.", "Olmurrani meata ake olpayian; kitoŋ olpayiani ole ilmurran ia kitok.", "philosophy"),
    ("The passage from warrior to elder is not a loss of strength but a gain of wisdom.", "Oolkinya ne olmurrani ne olpayian ake meeta, ne enkoitoi.", "philosophy"),
    ("In the manyatta, all voices matter; not just the loudest.", "E enkang, iyiok meata ake inkutuk, meeta ole sapuk.", "philosophy"),
    ("A warrior's first duty is to his community, not to himself.", "Inye en olmurrani ake olosho, meeta aria.", "philosophy"),
    ("The circle of warriors becomes the circle of elders.", "Oolkinya en ilmurran ake olkinya en ilpayiani.", "philosophy"),

    # Theological depth: Enkai
    ("Enkai speaks through the sacred mountain.", "Enkai eidaŋat ti Ol Doinyo Lengai.", "philosophy"),
    ("When it rains, Enkai Narok has answered our prayers.", "Olchani eaku, Enkai Narok eaidel.", "philosophy"),
    ("Drought is when Enkai Nanyokie reminds us of our humility.", "Olameyu ake Enkai Nanyokie eaidel olkale.", "philosophy"),
    ("The rainbow is Enkai's covenant with the people.", "Iilarok ake nanam en Enkai nabo Ilmaasai.", "philosophy"),
    ("To honor Enkai is to honor the land and the animals.", "Kitoŋ Enkai ake kitoŋ enkop ne ilowuarak.", "philosophy"),
    ("Enkai gives the first rains to the faithful.", "Enkai eaku olchani ne enyikoti.", "philosophy"),
    ("The blessings of Enkai flow through the oloiboni.", "Nanam en Enkai idiili ti Oloiboni.", "philosophy"),
    ("In giving thanks to Enkai, we give thanks to each other.", "Kidaŋat Enkai ake kidaŋat olkinya.", "philosophy"),

    # Advanced cultural concepts
    ("Osotua binds us across generations.", "Osotua ake naidim oolkinya ne kitoshoto.", "philosophy"),
    ("Enkanyit is not obedience; it is respect earned through wisdom.", "Enkanyit ake meeta olokui; ake sopa en enkoitoi.", "philosophy"),
    ("Manyatta is the heart of Maasai identity.", "Enkang ake olkokoi en olesere en Ilmaasai.", "philosophy"),
    ("To be Maasai is to be in sacred relationship with the land.", "Kesi Maasai ake kesi nabo enkop en osotua.", "philosophy"),
    ("The pastoralist path is a path of constant learning.", "Oloton en iltarakuoni ake oloton en enkisoma.", "philosophy"),
    ("Wealth is not measured by possession but by responsibility.", "Enye ake meeta naipisho, ne naidim ijopu.", "philosophy"),
    ("To live with nature is to live with Enkai.", "Kesi nabo ilowuarak ake kesi nabo Enkai.", "philosophy"),

    # --- CEREMONIES & RITUALS - ENHANCED ---
    # E-unoto celebration
    ("The e-unoto is a time of celebration and transformation.", "E-unoto ake taata en oolkinya ne oloorika.", "ceremony"),
    ("During e-unoto, warriors dance and sing their stories.", "E-unoto, ilmurran ia olalem ne idaŋat olesere.", "ceremony"),
    ("The e-unoto feast can last for days.", "Endaa en e-unoto ake ia taata.", "ceremony"),
    ("Families travel great distances for the e-unoto.", "Ilkera ia sirikuaniti ole e-unoto.", "ceremony"),
    ("The e-unoto marks the end of the warrior age.", "E-unoto aidim ooloorika en age en olmurrani.", "ceremony"),
    ("Elders bless the warriors before the e-unoto ceremony.", "Ilpayiani ia manyareta ilmurran netii e-unoto.", "ceremony"),
    ("The e-unoto ritual involves the shaving of warrior heads.", "E-unoto ake naidim enkaaki." , "ceremony"),
    ("After e-unoto, warriors become responsible for community defense.", "Netii e-unoto, ilmurran ake inye ole olosho.", "ceremony"),

    # Emuratta details
    ("Emuratta teaches boys about manhood and responsibility.", "Emuratta aidaŋat ilaiyiok enkoitoi en kemetie ne ijopu.", "ceremony"),
    ("The pre-circumcision period involves ritual seclusion.", "Oolalos netii emuratta ake olosio naikutuk.", "ceremony"),
    ("Ceremonies before emuratta include singing and dancing.", "Ritua netii emuratta ake olalem ne inyompi.", "ceremony"),
    ("The emuratta blade is sharpened with prayers.", "Olkali en emuratta ake nyeti nabo Enkai.", "ceremony"),
    ("After emuratta, the youth enter a new age group.", "Netii emuratta, ilaiyiok ia olporror naibaribari.", "ceremony"),
    ("The recovery period after emuratta is sacred.", "Taata en iloshe netii emuratta ake nanyore.", "ceremony"),

    # Enkipaata details
    ("The enkipaata brings together boys of similar age.", "Enkipaata idiuruuni ilaiyiok en kitaa.", "ceremony"),
    ("During enkipaata, boys are taught cultural knowledge.", "Enkipaata, ilaiyiok ia semuata olkulal en Ilmaasai.", "ceremony"),
    ("Enkipaata ceremonies last for several days.", "Ritua en enkipaata ake taata naidim.", "ceremony"),
    ("The enkipaata prepares boys physically and mentally.", "Enkipaata ake naidim ilaiyiok ole sopo ne enkoita.", "ceremony"),

    # Blessings and ritual vocabulary
    ("May Enkai bless you with many cattle.", "Enkai eaku nanyore nabo inkishu.", "ceremony"),
    ("A blessing from an elder is more precious than gold.", "Manyareta en olpayian ake aidim to olokui.", "ceremony"),
    ("The blessing of water is given at dawn.", "Manyareta en enkare eaku enkolooŋ.", "ceremony"),
    ("To bless the home, the oloiboni sprinkles sacred herbs.", "Kumanyareta enkang, oloiboni ia ishoi ilkeek.", "ceremony"),
    ("The blessing oils are prepared with reverence.", "Mpera en manyareta ia siimuata ne enyikoti.", "ceremony"),
    ("A warrior receives a blessing before battle.", "Olmurrani ia manyareta netii omwendo.", "ceremony"),
    ("The blessing of livestock ensures their health.", "Manyareta en inkishu aidim enjii.", "ceremony"),

    # --- GOVERNANCE & JUSTICE - ENHANCED ---
    # Council and leadership
    ("The enkiama is where all voices are heard.", "Enkiama ake taata ne iyiok meata idiuruuni.", "governance"),
    ("The olaiguenani speaks with the authority of the community.", "Olaiguenani eidaŋat nabo enyamal en olosho.", "governance"),
    ("Decisions are made through consensus, not command.", "Idaalan ake ti oolkinya, meeta ole olmurrani.", "governance"),
    ("The age-set system ensures fair distribution of leadership.", "Ilporror ake naidim ookinyanishi en ideata.", "governance"),
    ("Justice is swift and based on community agreement.", "Olkale ake maitoki ne ti oolkinya.", "governance"),
    ("An elder's judgment reflects the will of Enkai.", "Idaalan en olpayian ake enyamal en Enkai.", "governance"),

    # Law and tradition
    ("Our laws are written in our stories, not on paper.", "Ilmororrok enye ake olesere, meeta ta karta.", "governance"),
    ("Breaking tradition brings shame to the family.", "Kimeita ilmororrok ake naibor enkara.", "governance"),
    ("Compensation and reconciliation are the path to justice.", "Kenyareta ne oolkinya ake itiam en olkale.", "governance"),
    ("The oloshon guides us through disputes and conflicts.", "Oloshon aidim le ilmororrok ne oolalos.", "governance"),
    ("Ancestral law is as strong as current law.", "Ilmororrok en kitoshoto ake aidim to ilmororrok en taata.", "governance"),
    ("To transgress the oloshon is to transgress Enkai.", "Kimeita oloshon ake kimeita Enkai.", "governance"),

    # Age-set roles
    ("Each age-set has duties and responsibilities.", "Ilporror meata ake inye ne ijopu.", "governance"),
    ("The warrior age-set protects the community.", "Olmurrani ake naidim ole olosho.", "governance"),
    ("The elder age-set makes decisions for the people.", "Ilpayiani ake ia idaalan ole olosho.", "governance"),
    ("Junior warriors learn from senior warriors.", "Ilmurrani arikit ia semuata ti ilmurrani sapuk.", "governance"),
    ("The transition between age-sets is carefully managed.", "Oolkinya ne ilporror ake idim ne enyikoti.", "governance"),

    # Conflict resolution
    ("When there is conflict, we gather to talk.", "Asara oolalos, oolkinya ia enkiama idiuruuni.", "governance"),
    ("The goal of justice is to restore peace.", "Itiam en olkale ake kenyareta osilalei.", "governance"),
    ("Revenge is not justice; reconciliation is.", "Omwendo ake meeta olkale; oolkinya ake.", "governance"),
    ("A person who admits wrongdoing gains respect.", "Nejo naisho aria ake ia enkoitoi.", "governance"),

    # --- EDUCATION & KNOWLEDGE - ENHANCED ---
    # School subjects in Maasai
    ("Mathematics teaches us to count our blessings.", "Ilelek idiuruuni iyiok enkudonit enye.", "education"),
    ("Writing preserves our stories for future generations.", "Karinita aidim olesere le taata.", "education"),
    ("Science helps us understand the natural world.", "Enkoita naidim le enkop ne ilowuarak.", "education"),
    ("History teaches us who we are and where we come from.", "Olesere aidaŋat nejo enye ne taata.", "education"),
    ("Language is the key to our culture.", "Enkutuk ake enekunoto en olkulal enye.", "education"),
    ("The study of animals teaches us respect for life.", "Semuata en ilowuarak aidim enkanyit le inye.", "education"),
    ("Agricultural knowledge is passed from parent to child.", "Enkoita en iltara idiili ti kitoshoto ne taata.", "education"),
    ("Herding teaches responsibility and patience.", "Iltarakuon aidaŋat ijopu ne enyompi.", "education"),

    # Learning and instruction
    ("The teacher is a guide, not a giver of truth alone.", "Oltiankali ake olotion, meeta ole naidim sidai.", "education"),
    ("We learn by doing, not just by hearing.", "Semuata idiili ti kera, meeta olkudonit.", "education"),
    ("Questions are the beginning of wisdom.", "Ilalos ake ata en enkoitoi.", "education"),
    ("Mistakes are teachers if we listen to them.", "Ilmeita ake iltiankali wewe naidim.", "education"),
    ("Every elder is a teacher if we are willing to learn.", "Olpayian meata ake oltiankali wewe naidim.", "education"),
    ("The most important lesson is how to live together.", "Itiam en enkisoma ake kesi oolkinya.", "education"),

    # Intellectual and knowledge terms
    ("Memory is a treasure more valuable than gold.", "Enkonyek ake etara aidim to olokui.", "education"),
    ("Imagination is the seed of creation.", "Ilomeye ake ilokoji en ira.", "education"),
    ("Understanding comes from listening with an open heart.", "Enkoita idiili ti kudonit ne enkonyek naidim.", "education"),
    ("Knowledge without compassion is useless.", "Enkoita meeta enkanyit ake meita.", "education"),
    ("The pursuit of knowledge honors all who came before.", "Sirikuaniti en enkoita aidim kitoshoto.", "education"),

    # Traditional knowledge transmission
    ("The oloiboni teaches healing through plants and prayer.", "Oloiboni aidaŋat olpiroi ti ilkeek ne Enkai.", "education"),
    ("Astronomy has always guided Maasai navigation.", "Enkonyek en issiata aidim ooltoton en kitoshoto.", "education"),
    ("Weather prediction was an art perfected by our ancestors.", "Enkoita en enyama eaku ira ne kitoshoto.", "education"),
    ("Plant knowledge comes from generations of observation.", "Enkoita en ilkeek idiili ti kitoshoto.", "education"),
    ("Animal behavior teaches us about survival and community.", "Enyompi en ilowuarak aidaŋat inye ne oolkinya.", "education"),
    ("The stars guide both the shepherd and the seeker.", "Isiata idiuruuni olpastorali ne olsirikuaniti.", "education"),

    # --- HEALTH & MEDICINE ---
    ("The fever will break with rest and cool water.", "Olameyu ake ia tara nabo isio ne enkare naibor.", "health"),
    ("Honey and ginger are good for cough.", "Olsisikat ne enkeerooj aidim en oiseti.", "health"),
    ("Boil the water before drinking to stay healthy.", "Kilo enkare netii kidong ne enjii sidai.", "health"),
    ("The healer knows which root cures which illness.", "Oloiboni aidim ilkeek ne oidaŋat olpiroi.", "health"),
    ("A wound should be cleaned with clean water and herbs.", "Osit idiili kitoŋ nabo enkare sidai ne ilkeek.", "health"),
    ("The strength of the body comes from good food and rest.", "Eidim en ara idiili ti endaa sidai ne isio.", "health"),
    ("Prevention of disease is better than cure.", "Kitoŋ olpiroi aidim to kunarera.", "health"),
    ("Mother's milk gives the child strength and protection.", "Olkule en yeyo aidim inkera eidim ne kitoŋ.", "health"),
    ("Extreme heat causes dehydration; drink often.", "Enyama sapuk ake naidim namakua; kidong enka.", "health"),
    ("The oloiboni can heal with touch and knowledge.", "Oloiboni aidim kunarera nabo onkoka ne enkoita.", "health"),
    ("Childbirth is a sacred time attended by wise women.", "Iyie ake taata nanyore idiuruuni intoyie en enkoitoi.", "health"),
    ("A newborn should receive the blessing of the community.", "Inkera naibaribari ake ia manyareta en olosho.", "health"),
    ("Old age brings wisdom and also requires patience.", "Rishata aidim enkoitoi ne naidim enyompi.", "health"),
    ("The mind and body are connected; fear weakens the body.", "Enkoita ne ara ake oolkinya; oyio aitara ara.", "health"),

    # --- NUMBERS & TIME ---
    ("On the first day, there was only sky and earth.", "Olsirinit, ake isiata ne enkop meata.", "numbers"),
    ("Maasai months follow the seasons, not the calendar.", "Ilwakusha en Ilmaasai idiili ti enyama, meeta ta ilelek.", "numbers"),
    ("Twenty cattle is a significant bride price.", "Imukta inkishu ake naidim le endoto.", "numbers"),
    ("The rainy season brings two hundred days of water.", "Olchani-rashi aidim maitoki ne enkare.", "numbers"),
    ("A warrior's cycle lasts about fifteen years.", "Iltaa en olmurrani ake kitaa ne sitanai.", "numbers"),
    ("The new moon marks the beginning of the month.", "Ilalimon naibaribari ake ata en ilwakusha.", "numbers"),
    ("During the dry season, water sources number only five.", "Olameyu, enkare ake imiet meata.", "numbers"),
    ("Sixty elders make up the council of our section.", "Okurta ilpayiani ake idiuruuni enkiama.", "numbers"),
    ("Hundred warriors make a strong defense.", "Okurta ilmurrani ake naidim ole olosho.", "numbers"),
    ("The day is divided into seven parts by the sun.", "Olaa idiili kitaa ti isiata en ollamalo.", "numbers"),
    ("Three herds are necessary to survive drought.", "Okuni ilpastorali ake ikilikuano le olameyu.", "numbers"),
    ("The year has four seasons that guide our movements.", "Taata ake ilelek ookinyanishi enye nbo ooltoton.", "numbers"),

    # --- ENVIRONMENT & NATURE ---
    ("The Maasai Mara is a land of endless grasslands.", "Ilmaasai Mara ake enkop en esiaai meeta.", "environment"),
    ("Mount Kenya is sacred to all Maasai people.", "Ol Doinyo Kenia ake nanyore le Ilmaasai meata.", "environment"),
    ("The Rift Valley carves through Maasai lands.", "Olairanga idiili le enkop en Ilmaasai.", "environment"),
    ("Acacia trees provide shade and food for livestock.", "Oreteti ake naidim olonje ne inkishu.", "environment"),
    ("The savanna blooms after the rains.", "Aulo ia sidii netii olchani.", "environment"),
    ("We respect the wild animals that share our land.", "Kitoŋ ilowuarak idiili enkop enye nabo inkishu.", "environment"),
    ("The termite mound marks the boundary of our pasture.", "Oltung aidim ookinya en aulo enye.", "environment"),
    ("The salt lick attracts cattle and wild animals alike.", "Olokui aidim inkishu ne ilowuarak.", "environment"),
    ("When the hyena calls at night, we gather closer.", "Olngojine idaŋat ewarie, oolkinya ia enkang.", "environment"),
    ("The rains bring renewal to the parched earth.", "Olchani aidim inyama le enkop tara.", "environment"),
    ("Erosion threatens our grazing lands if we overuse them.", "Olenashe aidim aluo wewe naidim olkone.", "environment"),
    ("The river is life; we guard it carefully.", "Enkare ake inye; kitoŋ nanyore.", "environment"),
    ("Flash floods in the lowlands are sudden and dangerous.", "Enkare itara enkolooŋ ake maitoki ne aserushi.", "environment"),

    # --- DAILY LIFE ENRICHMENTS ---
    ("The women wake before dawn to prepare the day's activities.", "Intoyie ia osikuate enkolooŋ nbo kitoŋ taata.", "daily_life"),
    ("Breakfast is usually milk and blood from the cattle.", "Endaa en osikuate ake olkule ne sosiai.", "daily_life"),
    ("The children help herd the goats to the water hole.", "Inkera ia iltara imeit ti enkare.", "daily_life"),
    ("At midday, the family gathers in the shade to rest.", "Ollamalo, ilkera ia oolkinya nabo olonje.", "daily_life"),
    ("Dinner is a time for stories and family bonding.", "Endaa en enyama ake taata en olesere ne oolkinya.", "daily_life"),
    ("After dinner, the fires are banked for safety.", "Netii endaa, enkiok ia kitoŋ.", "daily_life"),
    ("The elderly sit by the fire and share wisdom.", "Ilpayiani ia enkolooŋ ne enkiok idiuruuni enkoitoi.", "daily_life"),
    ("Young children play games that teach hunting skills.", "Inkera kiti ia oolale ole iltaa neile.", "daily_life"),
    ("Mending clothes and tools is constant work for women.", "Karinyeta ne ilsipu ake taata en intoyie.", "daily_life"),
    ("The smell of wood smoke signals a welcoming home.", "Ubai en enkiok aidim enkang nanyore.", "daily_life"),
    ("Guests are always welcome and fed first.", "Olendi meata ia ikilikuano na endaa ata.", "daily_life"),
    ("A broken tool must be repaired immediately.", "Ilsipu itara idiili kikarika.", "daily_life"),
    ("We gather firewood in the early morning.", "Oreteti idiili kuura en osikuate.", "daily_life"),

    # --- KINSHIP & FAMILY DETAILED ---
    ("A man's first wife is honored above all women.", "Intoyie naibaribari en papai ake nanyore.", "kinship"),
    ("Co-wives support each other in raising children.", "Intoyie arikit oodurru kiera ne inkera.", "kinship"),
    ("The eldest son inherits his father's responsibilities.", "Olanye naibaribari ake ia noo ijopu en papai.", "kinship"),
    ("A daughter's marriage brings cattle to the family.", "Endoto en intoye aidim inkishu le ilkera.", "kinship"),
    ("Aunts and uncles share in raising their siblings' children.", "Apa ne olanai oodurru inkera en sibarini.", "kinship"),
    ("Cousins are considered siblings in Maasai culture.", "Inkera en apa ake olane oo Ilmaasai.", "kinship"),
    ("The grandmother's stories keep the family history alive.", "Olesere en nyokwe aidim inye meata.", "kinship"),
    ("Grandfathers teach boys the ways of manhood.", "Papanye aidaŋat olaiyiok ilmororrok en kemetie.", "kinship"),
    ("Adoption is honored; all children are family.", "Intoropye aidim nanyore; inkera meata ake ilkera.", "kinship"),
    ("A barren woman is not considered less worthy.", "Intoyie meata inye ake meata, meeta enkera meeta.", "kinship"),
    ("The father leads; the mother nurtures.", "Papai aidim; yeyo ake kiera.", "kinship"),
    ("Blood bonds extend beyond immediate family.", "Osotua idiili ti kitoshoto nbo ilkera.", "kinship"),

    # --- SUBTRIBE SPECIFIC EXPANSIONS ---
    # Ilkisongo details
    ("The Ilkisongo heartland stretches across northern Tanzania.", "Enkop en Ilkisongo aidim le Tanzania olpolos.", "culture"),
    ("Ilkisongo warriors are known for their fierce defense of homelands.", "Ilmurran en Ilkisongo aidim enkonyek en olosho.", "culture"),
    ("Ilkisongo traditions blend pastoral and trade influences.", "Ilmororrok en Ilkisongo idiili iltara ne olopukoi.", "culture"),

    # Ilpurko details
    ("Ilpurko Maa is considered the most eloquent dialect.", "Enkutuk en Ilpurko ake enaipukoi.", "culture"),
    ("Ilpurko elders are consulted on language matters.", "Ilpayiani en Ilpurko aidim enkutuk.", "culture"),
    ("Ilpurko ceremonies are attended by surrounding sections.", "Ritua en Ilpurko ia olkinya en ilmororrok.", "culture"),

    # Laikipiak legacy
    ("The Laikipiak plateau is sacred ground to our history.", "Laikipia ake nanyore en olesere en Ilmaasai.", "culture"),
    ("Songs of the Laikipiak warriors echo through time.", "Inyompi en ilmurran en Laikipiak aidim le taata.", "culture"),
    ("Laikipiak sections still gather during major ceremonies.", "Laikipiak oolkinya idiuruuni ritua sapuk.", "culture"),

    # Samburu connection
    ("Samburu and Maasai share language and history.", "Samburu ne Ilmaasai aidim enkutuk ne olesere.", "culture"),
    ("Inter-marriage between Samburu and Maasai is ancient practice.", "Endoto ne Samburu ne Ilmaasai aidim kitoshoto.", "culture"),
    ("Both peoples respect the same sacred mountains.", "Ilmaasai ne Samburu kitoŋ Ol Doinyo nanyore.", "culture"),

    # Ldikiri tradition
    ("The Ldikiri have maintained unique age-set practices.", "Ldikiri idiili ilporror en siriet.", "culture"),
    ("Ldikiri folklore includes stories of ancient migrations.", "Olesere en Ldikiri aidim olsirikuaniti en kitoshoto.", "culture"),

    # Environmental harmony
    ("To take from the land, we must give back.", "Kenyareta ti enkop, oolkinya ia enkaara.", "culture"),
    ("The cycle of seasons mirrors the cycle of generations.", "Ilelek ne rishata ake oodaanyo.", "culture"),
    ("Land is not owned; it is entrusted to us by Enkai.", "Enkop ake meeta irua; Enkai eaku nabo ta.", "culture"),

    # --- EXTENDED GREETINGS & SOCIAL PHRASES ---
    ("How are your cattle?", "Ata inkishu?", "greetings"),
    ("The cattle are fat and healthy.", "Inkishu ia nampai ne nenjii.", "greetings"),
    ("I bring greetings from my family.", "Aidaŋat supa ti ilkera enye.", "greetings"),
    ("Stay well and keep your family strong.", "Lotu sidai ne enyo ilkera.", "greetings"),
    ("We are blessed by your visit.", "Nanyore ti osirowa enye.", "greetings"),
    ("May your path be safe and your return quick.", "Olotion enye ake sidai ne oserian sidai.", "greetings"),
    ("Your name brings respect to our community.", "Esera enye aidim enkonyek le olosho.", "greetings"),
    ("We gather as one family today.", "Kiuria oolkinya olaa nee.", "greetings"),
    ("All is well in the lands of the Maasai.", "Sidai meata ti enkop en Ilmaasai.", "greetings"),
    ("The morning brings new hope.", "Olaa aidim naibaribari.", "greetings"),
    ("We greet you with respect and joy.", "Karisiti nabo enkanyit ne orarasi.", "greetings"),

    # --- EXTENDED LIVESTOCK & PASTORALISM ---
    ("A man is measured by the cattle he tends.", "Oleshanda aidim nba inkishu enye.", "livestock"),
    ("The cow knows her calf's voice.", "Olkiteng aidim inyompi en inkera enye.", "livestock"),
    ("Calves are born in the rainy season.", "Inkera ia naidim netii olchani.", "livestock"),
    ("We brand our cattle to mark our herds.", "Killana inklshu nbo ookinya enye.", "livestock"),
    ("The bull leads the herd to pasture.", "Olkiteng aidim ooltoton ti aulo.", "livestock"),
    ("Milk production depends on good pasture and water.", "Olkule idiili olorere sidai ne enkare.", "livestock"),
    ("During dry season, we move toward permanent water sources.", "Olameyu, oolkinya oolton ti enkare entara.", "livestock"),
    ("The shepherd knows each animal by their movements.", "Olpastorali aidim ilowurak ti enyompi enye.", "livestock"),
    ("Young goatherds learn responsibility through their flocks.", "Olaiyiok aidim ijopu nbo imeit.", "livestock"),
    ("Trading cattle is a sacred transaction.", "Otimpia inkishu ake nanyore.", "livestock"),
    ("A healthy herd is a family's legacy.", "Inkishu sidai ake enye en olkera.", "livestock"),
    ("Livestock are our currency and our contract.", "Inkishu ake olokui ne nanam enye.", "livestock"),
    ("We never sell breeding cows; they are our future.", "Inkishu entoyie ake meeta otimpia; taata aidim.", "livestock"),

    # --- EXTENDED ENVIRONMENT & LAND ---
    ("The mountain is home to our spirits.", "Ol doinyo ake enkaji en isiita enye.", "environment"),
    ("The grass remembers where we have been.", "Esiaai aidim kitaa enye.", "environment"),
    ("Water is more precious than gold.", "Enkare aidim aidim to olokui.", "environment"),
    ("The forest provides medicine, shelter, and food.", "Oreteti aidim olpiroi, enkaji ne endaa.", "environment"),
    ("Every rock and tree has a story.", "Ilkara ne oreteti meata ake olesere.", "environment"),
    ("The sky tells us when to move and when to stay.", "Isiata aidim taata ne siare.", "environment"),
    ("Sunrise promises a new beginning each day.", "Isiata-rashi aidim naibaribari olaa meata.", "environment"),
    ("Starlight guides those who know how to read it.", "Isiata-enkie aidim oltoton le neaku enkutuk.", "environment"),
    ("The red soil is the lifeblood of our land.", "Olutapia nanyokie ake sitie en enkop enye.", "environment"),
    ("Rain is Enkai's blessing made visible.", "Olchani ake nanyore en Enkai idiili.", "environment"),
    ("Drought tests our faith and our character.", "Olameyu aidim olkale en okul ne enkanyit.", "environment"),

    # --- CULTURE REFINEMENTS & VALUES ---
    ("Beauty is not in the face, but in character.", "Omeita meata ake enkara; ake enye enkoitoi.", "culture"),
    ("Strength without gentleness is not true strength.", "Eidim meata aku oodurru ake arikit.", "culture"),
    ("A child who respects their parents will be respected.", "Inkera eyu enkanyit papai ia enkonyek.", "culture"),
    ("The gift given with joy is twice as precious.", "Enkaara idim nabo orarasi ake arikit aidim.", "culture"),
    ("Our beads tell our history and our dreams.", "Osinka enye aidim olesere ne ilomeye enye.", "culture"),
    ("A warrior's shield is as important as his heart.", "Enkudung en olmurrani aidim enkonyek enye.", "culture"),
    ("The dance of our people is the heartbeat of our soul.", "Olalem en Ilmaasai ake olkokoi en inye.", "culture"),
    ("Honesty is the foundation of trust.", "Enkutuk en sidai ake enyamal en osotua.", "culture"),
    ("Generosity flows where the heart is open.", "Enkaara idiili taata wewe enkonyek naidim.", "culture"),
    ("We celebrate not just our victories, but our unity.", "Karisiti ake meata oricho, ne oolkinya.", "culture"),
    ("The Maasai way is the way of balance.", "Ilmororrok en Ilmaasai ake ilaa ne ilaa.", "culture"),
    ("To be Maasai is to walk with dignity and grace.", "Kesi Maasai ake kesi nabo enyamal ne orarasi.", "culture"),

    # --- EXTENDED PROVERBS & WISDOM (BONUS) ---
    ("Three things cannot be hidden: the sun, the moon, and the truth.", "Okuni ake meeta kitoŋ: isiata, ilalimon, ne sidai.", "proverbs"),
    ("The serpent cannot shed its skin if it does not struggle.", "Olkejua ake meata katera enkap wewe airemi.", "proverbs"),
    ("An arrow shot at random will rarely hit the target.", "Olbala idiili meeta ake om olaa.", "proverbs"),
    ("The fortune of a person is not forever; seasons change.", "Nanyore en oleshanda ake meeta taata; ilelek oodaanyo.", "proverbs"),
    ("Wisdom is not found in the loud voice, but in the quiet heart.", "Enkoitoi ake meeta enkutuk sapuk; ake enkonyek sidai.", "proverbs"),
    ("The river flows downward, not because it chooses, but because of water's nature.", "Enkare itungania ti esoko, meeta enye enkutuk; ake enkare.", "proverbs"),
    ("Two eyes see more than one eye.", "Ienkonyek are aidim to ienkonyek nabo.", "proverbs"),
    ("The hand that takes is below the hand that gives.", "Onkoka itiyio ake esoko ti onkoka entaara.", "proverbs"),

]


def main() -> None:
    output_path = Path("data/raw/cultural_pairs.jsonl")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    records = []
    for i, (english, maasai, domain) in enumerate(CULTURAL_PAIRS):
        # English -> Maasai
        records.append({
            "source_text": english,
            "target_text": maasai,
            "source_lang": "en",
            "target_lang": "mas",
            "domain": domain,
            "source_name": "cultural_manual",
            "quality_score": 1.0,
            "notes": "Manually created cultural translation pair",
        })
        # Maasai -> English (bidirectional)
        records.append({
            "source_text": maasai,
            "target_text": english,
            "source_lang": "mas",
            "target_lang": "en",
            "domain": domain,
            "source_name": "cultural_manual",
            "quality_score": 1.0,
            "notes": "Manually created cultural translation pair (reverse)",
        })

    with output_path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"Generated {len(records)} training records ({len(CULTURAL_PAIRS)} bidirectional pairs)")
    print(f"Output: {output_path}")

    # Print domain distribution
    from collections import Counter
    domain_counts = Counter(d for _, _, d in CULTURAL_PAIRS)
    print("\nDomain distribution:")
    for domain, count in domain_counts.most_common():
        print(f"  {domain}: {count} pairs ({count*2} records)")


if __name__ == "__main__":
    main()
