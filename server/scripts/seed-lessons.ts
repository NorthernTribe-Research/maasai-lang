import { db } from "../db";
import { languages, lessons } from "@shared/schema";
import { eq } from "drizzle-orm";

interface LessonData {
  title: string;
  description: string;
  content: string;
  level: number;
  type: "vocabulary" | "grammar" | "conversation" | "pronunciation";
  xpReward: number;
  order: number;
  duration: number;
  icon: string;
}

const lessonsByLanguage: Record<string, LessonData[]> = {
  // Spanish (es) - 15 lessons across 3 levels
  es: [
    // Level 1 - Beginner
    { title: "¡Hola! Greetings", description: "Learn basic Spanish greetings and introductions", content: "Hola, Buenos días, Buenas tardes, Buenas noches, ¿Cómo estás?", level: 1, type: "vocabulary", xpReward: 10, order: 1, duration: 10, icon: "👋" },
    { title: "Numbers 1-20", description: "Master Spanish numbers from one to twenty", content: "Uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez", level: 1, type: "vocabulary", xpReward: 10, order: 2, duration: 12, icon: "🔢" },
    { title: "Colors & Shapes", description: "Learn colors and basic shapes in Spanish", content: "Rojo, azul, verde, amarillo, naranja, morado, rosa, blanco, negro", level: 1, type: "vocabulary", xpReward: 10, order: 3, duration: 10, icon: "🎨" },
    { title: "Family Members", description: "Vocabulary for family relationships", content: "Madre, padre, hermano, hermana, abuelo, abuela, tío, tía, primo, prima", level: 1, type: "vocabulary", xpReward: 12, order: 4, duration: 15, icon: "👨‍👩‍👧‍👦" },
    { title: "Basic Pronunciation", description: "Practice Spanish vowels and common sounds", content: "A, E, I, O, U - Spanish vowel sounds and pronunciation rules", level: 1, type: "pronunciation", xpReward: 15, order: 5, duration: 20, icon: "🗣️" },
    
    // Level 2 - Elementary
    { title: "Food & Drinks", description: "Common food and beverage vocabulary", content: "Pan, agua, leche, café, té, fruta, carne, pescado, arroz, pasta", level: 2, type: "vocabulary", xpReward: 15, order: 6, duration: 15, icon: "🍽️" },
    { title: "Present Tense Verbs", description: "Learn regular -ar, -er, -ir verb conjugations", content: "Hablar, comer, vivir - present tense conjugations", level: 2, type: "grammar", xpReward: 20, order: 7, duration: 25, icon: "✏️" },
    { title: "Daily Routines", description: "Describe your daily activities in Spanish", content: "Me levanto, desayuno, trabajo, almuerzo, ceno, duermo", level: 2, type: "conversation", xpReward: 18, order: 8, duration: 20, icon: "⏰" },
    { title: "Shopping Phrases", description: "Essential phrases for shopping and markets", content: "¿Cuánto cuesta? Quiero comprar, Es muy caro, Está bien", level: 2, type: "conversation", xpReward: 15, order: 9, duration: 18, icon: "🛒" },
    { title: "R and RR Sounds", description: "Master the Spanish rolled R", content: "Practice single R and double RR pronunciation", level: 2, type: "pronunciation", xpReward: 20, order: 10, duration: 25, icon: "🎵" },
    
    // Level 3 - Intermediate
    { title: "Past Tense (Preterite)", description: "Learn to talk about completed past actions", content: "Hablé, comí, viví - preterite tense conjugations", level: 3, type: "grammar", xpReward: 25, order: 11, duration: 30, icon: "⏮️" },
    { title: "Travel & Directions", description: "Navigate and travel in Spanish-speaking countries", content: "¿Dónde está? A la izquierda, a la derecha, todo recto", level: 3, type: "conversation", xpReward: 22, order: 12, duration: 25, icon: "🗺️" },
    { title: "Weather & Seasons", description: "Discuss weather and seasonal changes", content: "Hace sol, llueve, nieva, hace frío, hace calor", level: 3, type: "vocabulary", xpReward: 18, order: 13, duration: 15, icon: "☀️" },
    { title: "Subjunctive Mood Intro", description: "Introduction to the Spanish subjunctive", content: "Espero que, quiero que, es importante que", level: 3, type: "grammar", xpReward: 30, order: 14, duration: 35, icon: "🎭" },
    { title: "Cultural Traditions", description: "Learn about Spanish and Latin American culture", content: "La Tomatina, Día de los Muertos, Semana Santa, Flamenco", level: 3, type: "conversation", xpReward: 20, order: 15, duration: 20, icon: "🎉" },
  ],
  
  // Mandarin Chinese (zh) - 15 lessons across 3 levels
  zh: [
    // Level 1 - Beginner
    { title: "你好! Greetings", description: "Learn basic Mandarin greetings", content: "你好 (nǐ hǎo), 早上好 (zǎo shang hǎo), 晚上好 (wǎn shang hǎo)", level: 1, type: "vocabulary", xpReward: 10, order: 1, duration: 10, icon: "👋" },
    { title: "Numbers 1-10", description: "Master Chinese numbers and counting", content: "一 (yī), 二 (èr), 三 (sān), 四 (sì), 五 (wǔ)", level: 1, type: "vocabulary", xpReward: 10, order: 2, duration: 12, icon: "🔢" },
    { title: "Pinyin Basics", description: "Learn the Pinyin romanization system", content: "Tones, initials, finals, and tone marks", level: 1, type: "pronunciation", xpReward: 15, order: 3, duration: 20, icon: "🗣️" },
    { title: "Family Terms", description: "Chinese family relationship vocabulary", content: "妈妈 (māma), 爸爸 (bàba), 哥哥 (gēge), 姐姐 (jiějie)", level: 1, type: "vocabulary", xpReward: 12, order: 4, duration: 15, icon: "👨‍👩‍👧‍👦" },
    { title: "Basic Phrases", description: "Essential everyday Chinese phrases", content: "谢谢 (xièxie), 对不起 (duìbuqǐ), 再见 (zàijiàn)", level: 1, type: "conversation", xpReward: 12, order: 5, duration: 15, icon: "💬" },
    
    // Level 2 - Elementary
    { title: "Food & Dining", description: "Chinese food vocabulary and dining phrases", content: "米饭 (mǐfàn), 面条 (miàntiáo), 茶 (chá), 水 (shuǐ)", level: 2, type: "vocabulary", xpReward: 15, order: 6, duration: 15, icon: "🍜" },
    { title: "Measure Words", description: "Learn Chinese classifier system", content: "个 (gè), 只 (zhī), 本 (běn), 张 (zhāng), 杯 (bēi)", level: 2, type: "grammar", xpReward: 20, order: 7, duration: 25, icon: "📏" },
    { title: "Four Tones Practice", description: "Master the four Mandarin tones", content: "Practice distinguishing and producing all four tones", level: 2, type: "pronunciation", xpReward: 20, order: 8, duration: 25, icon: "🎵" },
    { title: "Shopping Expressions", description: "Phrases for shopping and bargaining", content: "多少钱? (duōshao qián), 太贵了 (tài guì le)", level: 2, type: "conversation", xpReward: 18, order: 9, duration: 20, icon: "🛍️" },
    { title: "Time & Dates", description: "Tell time and dates in Chinese", content: "今天 (jīntiān), 明天 (míngtiān), 昨天 (zuótiān)", level: 2, type: "vocabulary", xpReward: 15, order: 10, duration: 18, icon: "📅" },
    
    // Level 3 - Intermediate
    { title: "Aspect Markers", description: "Learn 了, 过, 着 aspect particles", content: "Completed action, experience, ongoing action markers", level: 3, type: "grammar", xpReward: 25, order: 11, duration: 30, icon: "⏱️" },
    { title: "Directions & Travel", description: "Navigate in Chinese-speaking areas", content: "左边 (zuǒbian), 右边 (yòubian), 直走 (zhí zǒu)", level: 3, type: "conversation", xpReward: 22, order: 12, duration: 25, icon: "🧭" },
    { title: "Weather Vocabulary", description: "Discuss weather and climate", content: "天气 (tiānqì), 下雨 (xià yǔ), 下雪 (xià xuě)", level: 3, type: "vocabulary", xpReward: 18, order: 13, duration: 15, icon: "🌤️" },
    { title: "Complex Sentences", description: "Build complex sentence structures", content: "因为...所以, 虽然...但是, 如果...就", level: 3, type: "grammar", xpReward: 30, order: 14, duration: 35, icon: "🔗" },
    { title: "Chinese Festivals", description: "Learn about Chinese cultural celebrations", content: "春节 (Spring Festival), 中秋节 (Mid-Autumn Festival)", level: 3, type: "conversation", xpReward: 20, order: 15, duration: 20, icon: "🏮" },
  ],
  
  // English (en) - 15 lessons across 3 levels
  en: [
    // Level 1 - Beginner
    { title: "Hello! Greetings", description: "Learn basic English greetings", content: "Hello, Hi, Good morning, Good afternoon, Good evening, How are you?", level: 1, type: "vocabulary", xpReward: 10, order: 1, duration: 10, icon: "👋" },
    { title: "Numbers 1-20", description: "Master English numbers", content: "One, two, three, four, five, six, seven, eight, nine, ten", level: 1, type: "vocabulary", xpReward: 10, order: 2, duration: 12, icon: "🔢" },
    { title: "Colors", description: "Learn color names in English", content: "Red, blue, green, yellow, orange, purple, pink, white, black", level: 1, type: "vocabulary", xpReward: 10, order: 3, duration: 10, icon: "🎨" },
    { title: "Family Words", description: "English family vocabulary", content: "Mother, father, brother, sister, grandmother, grandfather", level: 1, type: "vocabulary", xpReward: 12, order: 4, duration: 15, icon: "👨‍👩‍👧‍👦" },
    { title: "Vowel Sounds", description: "Practice English vowel pronunciation", content: "Short and long vowel sounds: a, e, i, o, u", level: 1, type: "pronunciation", xpReward: 15, order: 5, duration: 20, icon: "🗣️" },
    
    // Level 2 - Elementary
    { title: "Food & Meals", description: "Common food vocabulary", content: "Bread, water, milk, coffee, tea, fruit, meat, fish, rice", level: 2, type: "vocabulary", xpReward: 15, order: 6, duration: 15, icon: "🍽️" },
    { title: "Present Simple Tense", description: "Learn present simple verb forms", content: "I work, you work, he/she works, we work, they work", level: 2, type: "grammar", xpReward: 20, order: 7, duration: 25, icon: "✏️" },
    { title: "Daily Activities", description: "Describe your daily routine", content: "I wake up, eat breakfast, go to work, have lunch, go home", level: 2, type: "conversation", xpReward: 18, order: 8, duration: 20, icon: "⏰" },
    { title: "Shopping Phrases", description: "Essential shopping expressions", content: "How much is this? I want to buy, It's too expensive", level: 2, type: "conversation", xpReward: 15, order: 9, duration: 18, icon: "🛒" },
    { title: "TH Sounds", description: "Master the TH pronunciation", content: "Practice voiced and voiceless TH sounds", level: 2, type: "pronunciation", xpReward: 20, order: 10, duration: 25, icon: "🎵" },
    
    // Level 3 - Intermediate
    { title: "Past Simple Tense", description: "Talk about past events", content: "I worked, you ate, he/she lived - past tense forms", level: 3, type: "grammar", xpReward: 25, order: 11, duration: 30, icon: "⏮️" },
    { title: "Travel & Directions", description: "Navigate and travel in English", content: "Where is...? Turn left, turn right, go straight", level: 3, type: "conversation", xpReward: 22, order: 12, duration: 25, icon: "🗺️" },
    { title: "Weather Talk", description: "Discuss weather conditions", content: "It's sunny, it's raining, it's snowing, it's cold, it's hot", level: 3, type: "vocabulary", xpReward: 18, order: 13, duration: 15, icon: "☀️" },
    { title: "Conditional Sentences", description: "Learn if-clauses and conditionals", content: "If I have time, I will... If I had known, I would have...", level: 3, type: "grammar", xpReward: 30, order: 14, duration: 35, icon: "🔀" },
    { title: "American Culture", description: "Learn about American customs and traditions", content: "Thanksgiving, Independence Day, Halloween, American etiquette", level: 3, type: "conversation", xpReward: 20, order: 15, duration: 20, icon: "🗽" },
  ],
  
  // Hindi (hi) - 15 lessons across 3 levels
  hi: [
    // Level 1 - Beginner
    { title: "नमस्ते! Greetings", description: "Learn basic Hindi greetings", content: "नमस्ते (namaste), सुप्रभात (suprabhat), शुभ रात्रि (shubh ratri)", level: 1, type: "vocabulary", xpReward: 10, order: 1, duration: 10, icon: "🙏" },
    { title: "Numbers 1-20", description: "Master Hindi numbers", content: "एक (ek), दो (do), तीन (teen), चार (char), पाँच (paanch)", level: 1, type: "vocabulary", xpReward: 10, order: 2, duration: 12, icon: "🔢" },
    { title: "Devanagari Script", description: "Introduction to Hindi writing system", content: "Learn vowels and consonants of Devanagari", level: 1, type: "vocabulary", xpReward: 15, order: 3, duration: 20, icon: "✍️" },
    { title: "Family Relations", description: "Hindi family vocabulary", content: "माता (mata), पिता (pita), भाई (bhai), बहन (bahan)", level: 1, type: "vocabulary", xpReward: 12, order: 4, duration: 15, icon: "👨‍👩‍👧‍👦" },
    { title: "Hindi Vowels", description: "Practice Hindi vowel sounds", content: "अ, आ, इ, ई, उ, ऊ - Hindi vowel pronunciation", level: 1, type: "pronunciation", xpReward: 15, order: 5, duration: 20, icon: "🗣️" },
    
    // Level 2 - Elementary
    { title: "Food Items", description: "Common Hindi food vocabulary", content: "रोटी (roti), चावल (chawal), दाल (daal), सब्ज़ी (sabzi)", level: 2, type: "vocabulary", xpReward: 15, order: 6, duration: 15, icon: "🍛" },
    { title: "Present Tense Verbs", description: "Learn Hindi verb conjugations", content: "मैं जाता हूँ (I go), तुम जाते हो (you go)", level: 2, type: "grammar", xpReward: 20, order: 7, duration: 25, icon: "✏️" },
    { title: "Daily Conversations", description: "Common daily Hindi phrases", content: "आप कैसे हैं? (How are you?), मैं ठीक हूँ (I'm fine)", level: 2, type: "conversation", xpReward: 18, order: 8, duration: 20, icon: "💬" },
    { title: "Market Shopping", description: "Shopping phrases in Hindi", content: "यह कितने का है? (How much is this?), बहुत महंगा है (Too expensive)", level: 2, type: "conversation", xpReward: 15, order: 9, duration: 18, icon: "🛒" },
    { title: "Retroflex Sounds", description: "Master Hindi retroflex consonants", content: "Practice ट, ठ, ड, ढ, ण sounds", level: 2, type: "pronunciation", xpReward: 20, order: 10, duration: 25, icon: "🎵" },
    
    // Level 3 - Intermediate
    { title: "Past Tense", description: "Learn Hindi past tense forms", content: "मैं गया (I went), मैंने खाया (I ate)", level: 3, type: "grammar", xpReward: 25, order: 11, duration: 30, icon: "⏮️" },
    { title: "Travel Phrases", description: "Navigate in Hindi-speaking regions", content: "कहाँ है? (Where is?), बाएँ (left), दाएँ (right)", level: 3, type: "conversation", xpReward: 22, order: 12, duration: 25, icon: "🗺️" },
    { title: "Weather & Seasons", description: "Discuss weather in Hindi", content: "धूप है (sunny), बारिश हो रही है (raining)", level: 3, type: "vocabulary", xpReward: 18, order: 13, duration: 15, icon: "🌦️" },
    { title: "Compound Verbs", description: "Learn Hindi compound verb structures", content: "कर देना, ले आना, चल पड़ना", level: 3, type: "grammar", xpReward: 30, order: 14, duration: 35, icon: "🔗" },
    { title: "Indian Festivals", description: "Learn about Indian cultural celebrations", content: "दिवाली (Diwali), होली (Holi), ईद (Eid)", level: 3, type: "conversation", xpReward: 20, order: 15, duration: 20, icon: "🪔" },
  ],
  
  // Arabic (ar) - 15 lessons across 3 levels
  ar: [
    // Level 1 - Beginner
    { title: "السلام عليكم! Greetings", description: "Learn basic Arabic greetings", content: "السلام عليكم (as-salamu alaykum), صباح الخير (sabah al-khayr)", level: 1, type: "vocabulary", xpReward: 10, order: 1, duration: 10, icon: "👋" },
    { title: "Numbers 1-20", description: "Master Arabic numbers", content: "واحد (wahid), اثنان (ithnan), ثلاثة (thalatha)", level: 1, type: "vocabulary", xpReward: 10, order: 2, duration: 12, icon: "🔢" },
    { title: "Arabic Alphabet", description: "Introduction to Arabic script", content: "Learn the 28 letters of the Arabic alphabet", level: 1, type: "vocabulary", xpReward: 15, order: 3, duration: 20, icon: "✍️" },
    { title: "Family Members", description: "Arabic family vocabulary", content: "أم (umm), أب (ab), أخ (akh), أخت (ukht)", level: 1, type: "vocabulary", xpReward: 12, order: 4, duration: 15, icon: "👨‍👩‍👧‍👦" },
    { title: "Arabic Sounds", description: "Practice unique Arabic phonemes", content: "ع (ayn), ح (ha), خ (kha), ق (qaf) sounds", level: 1, type: "pronunciation", xpReward: 15, order: 5, duration: 20, icon: "🗣️" },
    
    // Level 2 - Elementary
    { title: "Food & Cuisine", description: "Arabic food vocabulary", content: "خبز (khubz), ماء (ma'), شاي (shay), قهوة (qahwa)", level: 2, type: "vocabulary", xpReward: 15, order: 6, duration: 15, icon: "🥙" },
    { title: "Present Tense Verbs", description: "Learn Arabic verb conjugations", content: "أنا أذهب (I go), أنت تذهب (you go)", level: 2, type: "grammar", xpReward: 20, order: 7, duration: 25, icon: "✏️" },
    { title: "Daily Phrases", description: "Common everyday Arabic expressions", content: "كيف حالك? (How are you?), أنا بخير (I'm fine)", level: 2, type: "conversation", xpReward: 18, order: 8, duration: 20, icon: "💬" },
    { title: "Shopping Vocabulary", description: "Market and shopping phrases", content: "كم الثمن? (How much?), غالي جداً (Very expensive)", level: 2, type: "conversation", xpReward: 15, order: 9, duration: 18, icon: "🛒" },
    { title: "Emphatic Consonants", description: "Master Arabic emphatic sounds", content: "Practice ص, ض, ط, ظ pronunciation", level: 2, type: "pronunciation", xpReward: 20, order: 10, duration: 25, icon: "🎵" },
    
    // Level 3 - Intermediate
    { title: "Past Tense", description: "Learn Arabic past tense forms", content: "ذهبت (I went), أكلت (I ate)", level: 3, type: "grammar", xpReward: 25, order: 11, duration: 30, icon: "⏮️" },
    { title: "Travel & Directions", description: "Navigate in Arabic-speaking countries", content: "أين...? (Where is...?), يسار (left), يمين (right)", level: 3, type: "conversation", xpReward: 22, order: 12, duration: 25, icon: "🗺️" },
    { title: "Weather Expressions", description: "Discuss weather in Arabic", content: "الطقس (weather), مطر (rain), شمس (sun)", level: 3, type: "vocabulary", xpReward: 18, order: 13, duration: 15, icon: "☀️" },
    { title: "Dual Form", description: "Learn the Arabic dual number", content: "Singular, dual, and plural forms in Arabic", level: 3, type: "grammar", xpReward: 30, order: 14, duration: 35, icon: "👥" },
    { title: "Arab Culture", description: "Learn about Arab traditions", content: "رمضان (Ramadan), عيد (Eid), Arabic hospitality", level: 3, type: "conversation", xpReward: 20, order: 15, duration: 20, icon: "🕌" },
  ],
};

async function seedLessons() {
  console.log("🌱 Starting lesson seeding...\n");
  
  // Get all languages
  const allLanguages = await db.select().from(languages);
  console.log(`Found ${allLanguages.length} languages in database\n`);
  
  for (const language of allLanguages) {
    const languageLessons = lessonsByLanguage[language.code];
    
    if (!languageLessons) {
      console.log(`⚠️  No lesson data for ${language.name} (${language.code})`);
      continue;
    }
    
    console.log(`📚 Seeding lessons for ${language.flag} ${language.name}...`);
    
    // Check if lessons already exist
    const existingLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.languageId, language.id));
    
    if (existingLessons.length > 0) {
      console.log(`   ℹ️  ${existingLessons.length} lessons already exist, skipping...`);
      continue;
    }
    
    // Insert lessons
    let insertedCount = 0;
    for (const lessonData of languageLessons) {
      await db.insert(lessons).values({
        languageId: language.id,
        ...lessonData,
      });
      insertedCount++;
    }
    
    console.log(`   ✅ Inserted ${insertedCount} lessons\n`);
  }
  
  console.log("✨ Lesson seeding complete!");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedLessons()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

export { seedLessons };
