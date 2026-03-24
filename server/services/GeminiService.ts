import { BaseService } from "./BaseService";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cache } from "../utils/cache";

export class GeminiService extends BaseService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any | null = null;

  constructor() {
    super();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.log("GEMINI_API_KEY is missing; Gemini features are disabled until configured.", "warn");
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error("Gemini service is unavailable because GEMINI_API_KEY is not configured.");
    }

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw this.handleError(error, "Gemini content generation");
    }
  }

  async analyzeUserResponse(userResponse: string, context: any): Promise<any> {
    const prompt = `Analyze this language learning response. Context: ${JSON.stringify(context)}. User: "${userResponse}". Return JSON: {isCorrect: boolean, accuracy: number, feedback: string, nextStep: string}.`;
    const response = await this.generateContent(prompt);
    const jsonStr = response.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  async generateVocabularyList(language: string, theme: string, level: string, count: number): Promise<any> {
    const prompt = `Generate a list of ${count} vocabulary words for ${language} at ${level} level about ${theme}. Return JSON: {words: [{original: string, translation: string, pronunciation: string}]}.`;
    const response = await this.generateContent(prompt);
    const jsonStr = response.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  async generateGrammarExplanation(language: string, topic: string, level: string): Promise<any> {
    const prompt = `Explain grammar topic "${topic}" for ${language} at ${level} level. Return JSON: {explanation: string, examples: [{original: string, translation: string}]}.`;
    const response = await this.generateContent(prompt);
    const jsonStr = response.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  /**
   * Generate comprehensive cultural content
   * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
   */
  async generateCulturalContent(language: string, topic: string, level: string): Promise<any> {
    const prompt = `
      Provide comprehensive cultural insight about "${topic}" for ${language} learners at ${level} level.
      
      IMPORTANT: Focus heavily on practical cultural knowledge that learners need:
      
      1. CUSTOMS AND TRADITIONS (at least 4-5 specific customs):
         - Traditional practices related to this topic
         - Ceremonial or ritual aspects
         - Historical origins and significance
         - Modern adaptations of traditional customs
      
      2. SOCIAL ETIQUETTE (at least 4-5 specific rules):
         - Appropriate behavior in different contexts
         - What to do and what to avoid
         - Body language and non-verbal communication
         - Age, gender, and status considerations
         - Common mistakes foreigners make
      
      3. PRACTICAL TIPS (at least 4-5 actionable tips):
         - Real-world application advice
         - How to navigate social situations
         - Cultural sensitivity guidelines
         - Regional variations to be aware of
      
      4. DAILY LIFE CONTEXT:
         - How this topic appears in everyday situations
         - Common scenarios where this knowledge is needed
         - Modern vs. traditional practices
      
      Return JSON format:
      {
        "title": "cultural_topic_title",
        "content": "detailed_cultural_information_with_rich_context",
        "customs": ["custom1_with_detailed_explanation", "custom2_with_detailed_explanation", "custom3_with_detailed_explanation", "custom4_with_detailed_explanation"],
        "traditions": ["tradition1_with_context", "tradition2_with_context", "tradition3_with_context"],
        "etiquette": ["etiquette_rule1_with_explanation", "etiquette_rule2_with_explanation", "etiquette_rule3_with_explanation", "etiquette_rule4_with_explanation"],
        "practicalTips": ["tip1_with_specific_advice", "tip2_with_specific_advice", "tip3_with_specific_advice", "tip4_with_specific_advice"],
        "commonMistakes": ["mistake1_to_avoid", "mistake2_to_avoid"],
        "regionalVariations": "description_of_regional_differences",
        "relevance": "why_this_matters_for_language_learners_and_real_world_usage"
      }
    `;
    const response = await this.generateContent(prompt);
    const jsonStr = response.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  async providePronunciationFeedback(text: string, audioData: string): Promise<any> {
    // Placeholder for multimodal support or mock feedback
    return { score: 85, feedback: "Good pronunciation, focus on the vowels." };
  }

  async generateLearningPath(userId: string, languageId: number): Promise<any> {
    const prompt = `Generate a personalized learning path for user ${userId} learning language ${languageId}. Return JSON: {path: [{step: string, description: string}]}.`;
    const response = await this.generateContent(prompt);
    const jsonStr = response.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  async getLanguageMascotDialogue(language: string, context: string): Promise<any> {
    const prompt = `Generate a friendly dialogue from a language mascot for ${language}. Context: ${context}. Return JSON: {message: string}.`;
    const response = await this.generateContent(prompt);
    const jsonStr = response.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  }

  /**
   * Generate a complete curriculum for a language learning profile
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 23.2
   */
  async generateCurriculum(params: {
    targetLanguage: string;
    nativeLanguage: string;
    proficiencyLevel: string;
  }): Promise<any> {
    try {
      // Create cache key based on parameters
      const cacheKey = `ai:curriculum:${params.targetLanguage}:${params.nativeLanguage}:${params.proficiencyLevel}`;
      
      // Check cache first
      const cached = cache.get<any>(cacheKey);
      if (cached) {
        this.log(`Returning cached curriculum for ${params.targetLanguage} at ${params.proficiencyLevel}`, "info");
        return cached;
      }

      const prompt = `
        Generate a comprehensive language learning curriculum for ${params.targetLanguage}.
        
        Student Profile:
        - Target Language: ${params.targetLanguage}
        - Native Language: ${params.nativeLanguage}
        - Current Level: ${params.proficiencyLevel}
        
        Create a structured curriculum with:
        1. At least 10 lessons for this proficiency level
        2. Each lesson should include:
           - Title and description
           - Vocabulary words (with translations, pronunciation, examples, and cultural context where relevant)
           - Grammar concepts (with explanations, examples, and cultural usage notes)
           - Rich cultural content (customs, traditions, etiquette, social norms)
        3. Logical progression from basic to advanced concepts
        4. Estimated duration for each lesson (in minutes)
        
        CRITICAL: Cultural content MUST be rich and comprehensive:
        
        For VOCABULARY:
        - Every word should include a culturalNote explaining when/how it's used
        - Include social context (formal vs informal, age/status considerations)
        - Mention any cultural sensitivities or taboos
        
        For GRAMMAR:
        - Include culturalUsage explaining how native speakers use this in real situations
        - Explain formality levels and social implications
        - Mention regional variations if applicable
        
        For CULTURAL CONTENT (at least 2-3 sections per lesson):
        - CUSTOMS: 4-5 specific customs with detailed explanations
        - TRADITIONS: 3-4 traditional practices with historical context
        - ETIQUETTE: 4-5 specific etiquette rules with do's and don'ts
        - PRACTICAL TIPS: 4-5 actionable tips for real-world situations
        - COMMON MISTAKES: 2-3 mistakes foreigners commonly make
        - REGIONAL VARIATIONS: Differences across regions/dialects
        
        Return JSON format:
        {
          "curriculum": {
            "targetLanguage": "${params.targetLanguage}",
            "proficiencyLevel": "${params.proficiencyLevel}",
            "lessons": [
              {
                "title": "lesson_title",
                "description": "lesson_description",
                "orderIndex": 0,
                "estimatedDuration": 30,
                "vocabulary": [
                  {
                    "word": "word_in_target_language",
                    "translation": "translation_in_native_language",
                    "pronunciation": "phonetic_pronunciation",
                    "partOfSpeech": "noun/verb/etc",
                    "exampleSentences": ["example1", "example2"],
                    "culturalNote": "detailed_cultural_context_including_when_where_how_to_use_and_any_sensitivities"
                  }
                ],
                "grammar": [
                  {
                    "topic": "grammar_topic",
                    "explanation": "detailed_explanation",
                    "examples": ["example1", "example2"],
                    "rules": ["rule1", "rule2"],
                    "culturalUsage": "detailed_explanation_of_how_native_speakers_use_this_including_formality_levels_and_social_context"
                  }
                ],
                "culturalContent": [
                  {
                    "topic": "cultural_topic",
                    "content": "comprehensive_cultural_information_with_rich_details",
                    "customs": ["custom1_with_detailed_explanation", "custom2_with_detailed_explanation", "custom3_with_detailed_explanation", "custom4_with_detailed_explanation"],
                    "traditions": ["tradition1_with_context", "tradition2_with_context", "tradition3_with_context"],
                    "etiquette": ["etiquette_rule1_with_explanation", "etiquette_rule2_with_explanation", "etiquette_rule3_with_explanation", "etiquette_rule4_with_explanation"],
                    "practicalTips": ["tip1_with_specific_advice", "tip2_with_specific_advice", "tip3_with_specific_advice", "tip4_with_specific_advice"],
                    "commonMistakes": ["mistake1_to_avoid", "mistake2_to_avoid"],
                    "regionalVariations": "description_of_regional_differences",
                    "relevance": "why_this_matters_for_language_learners_and_real_world_usage"
                  }
                ]
              }
            ]
          }
        }
      `;

      const response = await this.generateContent(prompt);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      const result = JSON.parse(jsonStr);
      
      // Cache the result (1 hour TTL for AI-generated content)
      cache.set(cacheKey, result, cache.getTTL('AI_CONTENT'));
      this.log(`Cached curriculum for ${params.targetLanguage} at ${params.proficiencyLevel}`, "info");
      
      return result;
    } catch (error) {
      throw this.handleError(error, "Gemini curriculum generation");
    }
  }

  /**
   * Generate a single lesson with vocabulary, grammar, and cultural content
   * Requirements: 5.3, 5.4, 5.5, 23.2
   */
  async generateLesson(params: {
    topic: string;
    proficiencyLevel: string;
    targetLanguage: string;
    nativeLanguage: string;
  }): Promise<any> {
    try {
      // Create cache key based on parameters
      const cacheKey = `ai:lesson:${params.targetLanguage}:${params.topic}:${params.proficiencyLevel}`;
      
      // Check cache first
      const cached = cache.get<any>(cacheKey);
      if (cached) {
        this.log(`Returning cached lesson for topic "${params.topic}"`, "info");
        return cached;
      }

      const prompt = `
        Create a detailed language lesson for ${params.targetLanguage}.
        
        Lesson Parameters:
        - Topic: ${params.topic}
        - Proficiency Level: ${params.proficiencyLevel}
        - Target Language: ${params.targetLanguage}
        - Native Language: ${params.nativeLanguage}
        
        Include:
        1. 10-15 vocabulary words related to the topic (with cultural context)
        2. 2-3 grammar concepts (with cultural usage notes)
        3. Comprehensive cultural insights (customs, traditions, etiquette)
        4. Example sentences and usage
        
        CRITICAL: Emphasize cultural content throughout the lesson:
        
        For VOCABULARY (10-15 words):
        - EVERY word MUST include a culturalNote
        - Explain when, where, and how to use each word
        - Include formality levels and social context
        - Mention any cultural sensitivities or taboos
        
        For GRAMMAR (2-3 concepts):
        - EVERY grammar concept MUST include culturalUsage
        - Explain how native speakers actually use this
        - Include formality levels and social implications
        - Mention regional variations
        
        For CULTURAL CONTENT (2-3 comprehensive sections):
        - CUSTOMS: 4-5 specific customs with detailed explanations
        - TRADITIONS: 3-4 traditional practices with historical context
        - ETIQUETTE: 4-5 specific etiquette rules with do's and don'ts
        - PRACTICAL TIPS: 4-5 actionable tips for real-world situations
        - COMMON MISTAKES: 2-3 mistakes foreigners commonly make
        - REGIONAL VARIATIONS: Differences across regions/dialects
        
        Return JSON format:
        {
          "lesson": {
            "title": "lesson_title",
            "description": "lesson_description",
            "proficiencyLevel": "${params.proficiencyLevel}",
            "estimatedDuration": 30,
            "vocabulary": [
              {
                "word": "word",
                "translation": "translation",
                "pronunciation": "pronunciation",
                "partOfSpeech": "part_of_speech",
                "exampleSentences": ["example1", "example2"],
                "culturalNote": "detailed_cultural_context_including_when_where_how_to_use_formality_level_and_any_sensitivities"
              }
            ],
            "grammar": [
              {
                "topic": "topic",
                "explanation": "explanation",
                "examples": ["example1", "example2"],
                "rules": ["rule1", "rule2"],
                "culturalUsage": "detailed_explanation_of_how_native_speakers_use_this_including_formality_levels_social_context_and_regional_variations"
              }
            ],
            "culturalContent": [
              {
                "topic": "topic",
                "content": "comprehensive_cultural_information_with_rich_details",
                "customs": ["custom1_with_detailed_explanation", "custom2_with_detailed_explanation", "custom3_with_detailed_explanation", "custom4_with_detailed_explanation"],
                "traditions": ["tradition1_with_context", "tradition2_with_context", "tradition3_with_context"],
                "etiquette": ["etiquette_rule1_with_explanation", "etiquette_rule2_with_explanation", "etiquette_rule3_with_explanation", "etiquette_rule4_with_explanation"],
                "practicalTips": ["tip1_with_specific_advice", "tip2_with_specific_advice", "tip3_with_specific_advice", "tip4_with_specific_advice"],
                "commonMistakes": ["mistake1_to_avoid", "mistake2_to_avoid"],
                "regionalVariations": "description_of_regional_differences",
                "relevance": "why_this_matters_for_language_learners_and_real_world_usage"
              }
            ]
          }
        }
      `;

      const response = await this.generateContent(prompt);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      const result = JSON.parse(jsonStr);
      
      // Cache the result (1 hour TTL for AI-generated content)
      cache.set(cacheKey, result, cache.getTTL('AI_CONTENT'));
      this.log(`Cached lesson for topic "${params.topic}"`, "info");
      
      return result;
    } catch (error) {
      throw this.handleError(error, "Gemini lesson generation");
    }
  }

  /**
   * Generate conversation response for voice teaching
   * Requirements: 7.1, 7.4, 7.5, 7.6
   */
  async generateConversationResponse(params: {
    conversationHistory: Array<{ role: string; content: string }>;
    userInput: string;
    proficiencyLevel: string;
    language: string;
  }): Promise<string> {
    try {
      const historyText = params.conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `
        You are an AI language teacher for ${params.language}.
        Student level: ${params.proficiencyLevel}
        
        Conversation history:
        ${historyText}
        
        Student said: "${params.userInput}"
        
        Provide a response that:
        1. Continues the conversation naturally
        2. Corrects any errors gently
        3. Introduces new vocabulary or grammar when appropriate
        4. Adapts to the student's proficiency level
        5. Encourages further practice
        
        Respond in ${params.language} with corrections in parentheses if needed.
      `;

      return await this.generateContent(prompt);
    } catch (error) {
      throw this.handleError(error, "Gemini conversation response");
    }
  }

  /**
   * Explain a language concept for AI tutoring
   * Requirements: 9.2, 9.3, 9.4, 9.6
   */
  async explainConcept(params: {
    question: string;
    context: any;
    proficiencyLevel: string;
  }): Promise<any> {
    try {
      const prompt = `
        You are an AI language tutor. A ${params.proficiencyLevel} level student asks:
        
        "${params.question}"
        
        Context: ${JSON.stringify(params.context)}
        
        Provide a clear explanation that:
        1. Answers the question directly
        2. Uses appropriate complexity for their level
        3. Includes examples and analogies
        4. Provides cultural context when relevant (customs, etiquette, traditions)
        5. Explains how native speakers use this in real situations
        6. Encourages further learning
        
        CRITICAL: If the question relates to vocabulary, grammar, or language usage,
        you MUST include comprehensive cultural information:
        
        CULTURAL CONTEXT TO INCLUDE:
        - Customs and traditions related to the topic
        - Social etiquette and appropriate behavior (do's and don'ts)
        - When and where this is typically used
        - Formality levels and social implications
        - Age, gender, and status considerations
        - Regional variations and dialects
        - Common mistakes foreigners make
        - Practical tips for real-world usage
        - Historical or cultural background
        
        Return JSON format:
        {
          "explanation": "detailed_explanation_with_integrated_cultural_context",
          "examples": ["example1_with_cultural_context", "example2_with_cultural_context"],
          "culturalNotes": ["cultural_note1_about_customs_or_etiquette", "cultural_note2_about_traditions", "cultural_note3_about_social_norms", "cultural_note4_about_practical_usage"],
          "etiquetteRules": ["etiquette_rule1_with_explanation", "etiquette_rule2_with_explanation"],
          "commonMistakes": ["mistake1_foreigners_make", "mistake2_foreigners_make"],
          "relatedConcepts": ["concept1", "concept2"],
          "practiceExercises": ["exercise1", "exercise2"]
        }
      `;

      const response = await this.generateContent(prompt);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      throw this.handleError(error, "Gemini concept explanation");
    }
  }
}

export const geminiService = new GeminiService();
