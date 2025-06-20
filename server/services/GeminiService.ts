import { BaseService } from './BaseService';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * Service for interacting with Google's Gemini AI
 */
export class GeminiService extends BaseService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private apiKey: string;

  constructor() {
    super();
    
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!this.apiKey) {
      this.log("No Gemini API key found in environment variables", "warn");
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // Use Gemini-pro for text generation
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      this.log("Gemini AI service initialized", "info");
    } catch (error) {
      this.handleError(error, "initializing Gemini AI service");
    }
  }

  /**
   * Generate text content using Gemini AI
   * @param prompt Text prompt to generate content from
   * @returns Generated content as string
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      throw this.handleError(error, "generating content");
    }
  }

  /**
   * Provide feedback on pronunciation using Gemini AI
   * @param audioUrl URL to the audio recording
   * @param originalText The text that was supposed to be pronounced
   * @param languageCode The language code (e.g., "es" for Spanish)
   * @returns Structured feedback about pronunciation
   */
  async providePronunciationFeedback(
    audioUrl: string,
    originalText: string,
    languageCode: string
  ): Promise<string> {
    try {
      // Note: Ideally we would analyze the audio, but since Gemini doesn't accept audio directly,
      // we're using a text-based approach. In a production app, we would use a specialized
      // speech recognition API first, then send the transcript to Gemini for analysis.
      
      const prompt = `
      You are a language learning assistant specializing in pronunciation for ${languageCode}.
      
      The user was trying to pronounce: "${originalText}"
      
      Assuming there are some mistakes, provide detailed feedback on:
      1. Likely pronunciation errors for this specific text
      2. Tips to improve pronunciation for these specific sounds
      3. A simple phonetic guide for challenging words or sounds
      
      Format the feedback in a friendly, encouraging way.
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw this.handleError(error, "providing pronunciation feedback");
    }
  }

  /**
   * Generate a personalized learning path
   * @param languageCode The language code (e.g., "es" for Spanish)
   * @param currentLevel User's current proficiency level (beginner, intermediate, advanced)
   * @param learningGoals User's learning goals
   * @returns A structured learning path as a string
   */
  async generateLearningPath(
    languageCode: string,
    currentLevel: string,
    learningGoals: string
  ): Promise<string> {
    try {
      const prompt = `
      You are a language learning specialist creating a custom learning path for a student.
      
      Language: ${languageCode}
      Current Level: ${currentLevel}
      Learning Goals: ${learningGoals}
      
      Create a structured 8-week learning path with:
      1. Weekly learning objectives
      2. Recommended activities (2-3 per week)
      3. Focus vocabulary and grammar concepts
      4. A weekly mini-challenge
      
      Make the path appropriately challenging for their level and aligned with their goals.
      Format the response as a clear, organized learning plan they can follow.
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw this.handleError(error, "generating learning path");
    }
  }

  /**
   * Get dialog from a language mascot character
   * @param languageCode The language code (e.g., "es" for Spanish)
   * @param context The context in which the mascot is speaking
   * @returns The mascot's response as a string
   */
  async getLanguageMascotDialogue(
    languageCode: string,
    context: string
  ): Promise<string> {
    try {
      // Get information about the mascot for this language
      const mascotInfo = this.getMascotInfo(languageCode);
      
      const prompt = `
      You are ${mascotInfo.name}, a friendly mascot character for people learning ${mascotInfo.language}.
      
      Your personality: ${mascotInfo.personality}
      
      Respond to this learning situation: "${context}"
      
      Your response should:
      - Be written in the voice and style of ${mascotInfo.name}
      - Include 1-2 simple phrases in ${mascotInfo.language} (with translations)
      - Be encouraging and helpful
      - Be brief (2-3 sentences maximum)
      
      Remember to stay in character - speak as ${mascotInfo.name} would!
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw this.handleError(error, "generating mascot dialogue");
    }
  }

  /**
   * Get information about the language mascot
   * @param languageCode The language code
   * @returns Mascot information
   */
  private getMascotInfo(languageCode: string): {
    name: string;
    language: string;
    personality: string;
  } {
    // Map language codes to mascot information
    const mascots: Record<string, { name: string; language: string; personality: string }> = {
      es: {
        name: "Taco the Toucan",
        language: "Spanish",
        personality: "Energetic, cheerful, and loves to use colorful expressions. Frequently says '¡Fantástico!' and ends sentences with '¿sí?'"
      },
      fr: {
        name: "Croissant the Fox",
        language: "French",
        personality: "Sophisticated, witty, and slightly dramatic. Uses 'mon ami' frequently and has a poetic way of explaining things."
      },
      de: {
        name: "Pretzel the Dachshund",
        language: "German",
        personality: "Methodical, friendly, and enthusiastic about rules and structure. Says 'Wunderbar!' when praising learners."
      },
      ja: {
        name: "Mochi the Tanuki",
        language: "Japanese",
        personality: "Calm, thoughtful, and occasionally mischievous. Ends sentences with 'desu ne' and values harmony in learning."
      },
      zh: {
        name: "Dumpling the Panda",
        language: "Chinese",
        personality: "Patient, wise, and encouraging. Speaks slowly and clearly, often using proverbs and saying '加油 (jiā yóu)' for encouragement."
      },
      it: {
        name: "Pasta the Cat",
        language: "Italian",
        personality: "Passionate, expressive, and gestures frequently. Says 'Bellissimo!' and 'Mamma mia!' and talks about language as if it's a delicious meal."
      },
      ru: {
        name: "Samovar the Bear",
        language: "Russian",
        personality: "Strong, warm-hearted, and resilient. Speaks in a deep voice, uses 'little one' (малыш) as a term of endearment."
      }
    };
    
    // Default to Spanish mascot if language not found
    return mascots[languageCode] || mascots.es;
  }

  /**
   * Generate vocabulary list by theme
   */
  async generateVocabularyList(
    language: string,
    theme: string,
    level: string,
    count: number = 20
  ): Promise<Array<{
    word: string;
    translation: string;
    pronunciation: string;
    example: string;
    difficulty: number;
    category: string;
  }>> {
    if (!this.isAvailable) {
      return this.getDefaultVocabulary(theme, count);
    }

    try {
      const prompt = `Generate ${count} vocabulary words for ${language} on theme: "${theme}" at ${level} level.

Return only a JSON array with this structure:
[
  {
    "word": "palabra",
    "translation": "word",
    "pronunciation": "pa-LAH-bra",
    "example": "Esta es una palabra nueva.",
    "difficulty": 2,
    "category": "noun"
  }
]`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const parsed = JSON.parse(response);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return this.getDefaultVocabulary(theme, count);
      }
    } catch (error) {
      this.handleError(error, "generating vocabulary list");
      return this.getDefaultVocabulary(theme, count);
    }
  }

  /**
   * Generate grammar explanations
   */
  async generateGrammarExplanation(
    language: string,
    grammarTopic: string,
    level: string
  ): Promise<{
    concept: string;
    explanation: string;
    rules: string[];
    examples: Array<{
      sentence: string;
      translation: string;
      breakdown: string;
    }>;
    exercises: Array<{
      question: string;
      answer: string;
      explanation: string;
    }>;
    commonMistakes: string[];
  }> {
    if (!this.isAvailable) {
      return this.getDefaultGrammarExplanation(grammarTopic);
    }

    try {
      const prompt = `Explain ${grammarTopic} in ${language} for ${level} learners.

Return JSON:
{
  "concept": "${grammarTopic}",
  "explanation": "Clear explanation",
  "rules": ["rule1", "rule2"],
  "examples": [{"sentence": "Example", "translation": "Translation", "breakdown": "Grammar breakdown"}],
  "exercises": [{"question": "Question", "answer": "Answer", "explanation": "Why"}],
  "commonMistakes": ["mistake1", "mistake2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        return JSON.parse(response);
      } catch {
        return this.getDefaultGrammarExplanation(grammarTopic);
      }
    } catch (error) {
      this.handleError(error, "generating grammar explanation");
      return this.getDefaultGrammarExplanation(grammarTopic);
    }
  }

  /**
   * Generate cultural content
   */
  async generateCulturalContent(
    language: string,
    topic: string,
    level: string
  ): Promise<{
    title: string;
    content: string;
    vocabulary: string[];
    discussion: string[];
    activities: string[];
    resources: string[];
  }> {
    if (!this.isAvailable) {
      return this.getDefaultCulturalContent(topic);
    }

    try {
      const prompt = `Create cultural content about ${topic} for ${language} learners at ${level} level.

Return JSON:
{
  "title": "Title about ${topic}",
  "content": "Educational content",
  "vocabulary": ["word1", "word2"],
  "discussion": ["question1", "question2"],
  "activities": ["activity1", "activity2"],
  "resources": ["resource1", "resource2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        return JSON.parse(response);
      } catch {
        return this.getDefaultCulturalContent(topic);
      }
    } catch (error) {
      this.handleError(error, "generating cultural content");
      return this.getDefaultCulturalContent(topic);
    }
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  private getDefaultVocabulary(theme: string, count: number) {
    const spanishColors = [
      { word: "rojo", translation: "red", pronunciation: "RO-ho", example: "El coche es rojo", difficulty: 1, category: "adjective" },
      { word: "azul", translation: "blue", pronunciation: "ah-SOOL", example: "El cielo es azul", difficulty: 1, category: "adjective" },
      { word: "verde", translation: "green", pronunciation: "BEHR-deh", example: "La hierba es verde", difficulty: 1, category: "adjective" }
    ];
    
    const spanishAnimals = [
      { word: "perro", translation: "dog", pronunciation: "PEH-rro", example: "Mi perro es grande", difficulty: 1, category: "noun" },
      { word: "gato", translation: "cat", pronunciation: "GAH-to", example: "El gato está durmiendo", difficulty: 1, category: "noun" },
      { word: "pájaro", translation: "bird", pronunciation: "PAH-ha-ro", example: "El pájaro vuela alto", difficulty: 2, category: "noun" }
    ];
    
    if (theme.toLowerCase().includes('color')) {
      return spanishColors.slice(0, count);
    } else if (theme.toLowerCase().includes('animal')) {
      return spanishAnimals.slice(0, count);
    }
    
    // Generic defaults
    const defaults = Array(count).fill(null).map((_, i) => ({
      word: `palabra${i + 1}`,
      translation: `word${i + 1}`,
      pronunciation: `pronunciation${i + 1}`,
      example: `Ejemplo ${i + 1}`,
      difficulty: 2,
      category: "noun"
    }));
    return defaults;
  }

  private getDefaultGrammarExplanation(topic: string) {
    return {
      concept: topic,
      explanation: `Basic explanation of ${topic}`,
      rules: [`Key rule about ${topic}`],
      examples: [],
      exercises: [],
      commonMistakes: []
    };
  }

  private getDefaultCulturalContent(topic: string) {
    return {
      title: `Cultural Insights: ${topic}`,
      content: `Learn about ${topic} in different cultures`,
      vocabulary: [],
      discussion: [`What do you think about ${topic}?`],
      activities: ["Research activity"],
      resources: ["Online resources"]
    };
  }
}