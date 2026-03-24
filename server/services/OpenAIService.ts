import { BaseService } from './BaseService';
import { openai } from '../openai';
import { cache } from '../utils/cache';

/**
 * Service for interacting with OpenAI API
 */
export class OpenAIService extends BaseService {
  private openai: any;
  private apiKey: string = process.env.OPENAI_API_KEY || "";

  constructor() {
    super();
    this.openai = openai;
    
    if (!this.apiKey) {
      this.log("No OpenAI API key found in environment variables", "warn");
    } else {
      this.log("OpenAI service initialized", "info");
    }
  }

  /**
   * Generate text completion using OpenAI
   */
  async generateCompletion(
    prompt: string,
    model: string = 'gpt-3.5-turbo',
    maxTokens: number = 500,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature
      });
      
      return response.choices[0].message.content || '';
    } catch (error) {
      throw this.handleError(error, "generating completion");
    }
  }

  /**
   * Generate a chat completion
   */
  async generateChatCompletion(
    messages: any[],
    model: string = 'gpt-3.5-turbo',
    maxTokens: number = 500,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      });
      
      return response.choices[0].message.content || '';
    } catch (error) {
      throw this.handleError(error, "generating chat completion");
    }
  }
  
  /**
   * Generate an exercise for language learning
   */
  async generateExercise(language: string, level: string, type: string): Promise<any> {
    try {
      const prompt = `Create a ${level} level ${type} exercise for learning ${language}. Format as JSON: {question: string, options: string[], correctAnswer: string, explanation: string}.`;
      const completion = await this.generateCompletion(prompt, 'gpt-4', 800, 0.7);
      
      try {
        return JSON.parse(completion.replace(/```json|```/g, "").trim());
      } catch (parseError) {
        return {
          question: "Translate 'Hello' to " + language,
          correctAnswer: "Hello",
          explanation: "Fallback exercise",
          options: ["Hello", "Goodbye", "Yes", "No"]
        };
      }
    } catch (error) {
      throw this.handleError(error, "generating exercise");
    }
  }

  /**
   * Generate personalized exercises targeting weakness areas
   * Requirements: 6.1, 6.2, 6.3, 6.4, 23.2
   */
  async generateExercises(params: {
    weaknesses: Array<{ topic: string; category: string }>;
    proficiencyLevel: string;
    targetLanguage: string;
    count: number;
  }): Promise<any[]> {
    try {
      const weaknessTopics = params.weaknesses.map(w => w.topic).join(', ');
      
      // Create cache key based on parameters
      const cacheKey = `ai:exercises:${params.targetLanguage}:${params.proficiencyLevel}:${weaknessTopics}:${params.count}`;
      
      // Check cache first
      const cached = cache.get<any[]>(cacheKey);
      if (cached) {
        this.log(`Returning cached exercises for ${params.targetLanguage}`, "info");
        return cached;
      }

      const prompt = `
        Generate ${params.count} language learning exercises for ${params.targetLanguage}.
        
        Student Profile:
        - Proficiency Level: ${params.proficiencyLevel}
        - Weak Areas: ${weaknessTopics}
        
        Create exercises that:
        1. Target the identified weak areas
        2. Match the student's proficiency level
        3. Include various types: translation, fill-in-blank, multiple-choice
        4. Provide clear explanations for correct answers
        5. Have appropriate difficulty (1-10 scale)
        
        Return JSON array:
        [
          {
            "type": "translation|fill-in-blank|multiple-choice",
            "question": "exercise_question",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": "correct_answer",
            "explanation": "why_this_is_correct",
            "difficulty": 5,
            "targetWeakness": "weakness_topic"
          }
        ]
      `;

      const response = await this.generateCompletion(prompt, 'gpt-4o', 1500, 0.7);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      const result = JSON.parse(jsonStr);
      
      // Cache the result (30 minutes TTL for exercises)
      cache.set(cacheKey, result, cache.getTTL('EXERCISE'));
      this.log(`Cached exercises for ${params.targetLanguage}`, "info");
      
      return result;
    } catch (error) {
      throw this.handleError(error, "generating exercises");
    }
  }

  /**
   * Generate a full Duolingo-style lesson timeline
   * Requirements: Phase 7
   */
  async generateLessonExercises(params: {
    language: string;
    theme: string;
    level: number;
    count: number;
  }): Promise<any[]> {
    try {
      const cacheKey = `ai:lesson_exercises:${params.language}:${params.theme}:${params.level}:${params.count}`;
      const cached = cache.get<any[]>(cacheKey);
      if (cached) {
        this.log(`Returning cached lesson exercises for ${params.language} - ${params.theme}`, "info");
        return cached;
      }

      const prompt = `
        Generate ${params.count} highly varied language learning exercises for learning ${params.language}.
        The topic/theme of the lesson is: "${params.theme}".
        The difficulty level is ${params.level} (scale 1-10, where 1 is absolute beginner).
        
        You must return a JSON array of objects. Each object represents an exercise and must strictly conform to this schema:
        
        Array of:
        {
          "type": string // MUST be one of: "multiple-choice", "word-bank", "fill-blank", "matching", "translate", "listening", "character-writing"
          "question": string // The instruction or prompt. E.g., "Translate this sentence", "Select the correct meaning", "Fill in the blank", "Draw the character"
          "options"?: string[] // 4 possible choices (required for multiple-choice, listening)
          "words"?: string[] // List of words for the word-bank to construct the sentence, along with decoys (required for word-bank)
          "sentence"?: string // A sentence with an underscore "___" representing the blank (required for fill-blank)
          "pairs"?: { left: string, right: string }[] // 4 matching pairs of words/phrases (required for matching)
          "correctAnswer": string | string[] // The exact correct answer. For matching, just put "matched". For word-bank, array of words in order. For character-writing, the character itself.
          "character"?: string // The exact foreign character or script letter to be drawn (required for character-writing)
          "pinyin"?: string // The phonetic pronunciation and/or translation of the character (required for character-writing)
          "explanation"?: string // Brief explanation if they get it wrong
        }
        
        Make sure to include a mix of all the different types (at least one of each if possible).
        For "listening" type, pretend audio generation will happen later, but provide conversational text in the target language in the "correctAnswer" and let "options" be translations, or vice-versa.
        Only include "character-writing" exercises if the target language uses a non-Latin script (e.g. Chinese, Japanese, Arabic, Hindi, etc.). Do NOT include it for languages like Spanish or English.
      `;

      const response = await this.generateCompletion(prompt, 'gpt-4o', 3000, 0.7);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      let result = [];
      try {
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse AI lesson exercises JSON", e);
        throw e;
      }
      
      // Inject IDs
      result = result.map((ex: any, index: number) => ({
        ...ex,
        id: `ai_ex_${index}_${Date.now()}`
      }));

      cache.set(cacheKey, result, cache.getTTL('EXERCISE'));
      return result;
    } catch (error) {
      throw this.handleError(error, "generating lesson exercises");
    }
  }

  /**
   * Translate text between languages
   * Requirements: 18.2
   */
  async translateText(params: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string> {
    try {
      const prompt = `Translate the following text from ${params.sourceLanguage} to ${params.targetLanguage}:\n\n"${params.text}"\n\nProvide only the translation, no explanations.`;
      
      return await this.generateCompletion(prompt, 'gpt-4o', 500, 0.3);
    } catch (error) {
      throw this.handleError(error, "translating text");
    }
  }

  /**
   * Evaluate a student's answer to an exercise
   * Requirements: 6.5
   */
  async evaluateAnswer(params: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }): Promise<any> {
    try {
      const prompt = `
        Evaluate this language learning exercise answer:
        
        Question: ${params.question}
        Correct Answer: ${params.correctAnswer}
        Student's Answer: ${params.userAnswer}
        
        Provide:
        1. Whether the answer is correct (exact match or acceptable variation)
        2. Accuracy score (0-100)
        3. Detailed feedback
        4. Suggestions for improvement if incorrect
        
        Return JSON:
        {
          "isCorrect": true/false,
          "accuracy": 0-100,
          "feedback": "detailed_feedback",
          "suggestions": ["suggestion1", "suggestion2"]
        }
      `;

      const response = await this.generateCompletion(prompt, 'gpt-4o', 500, 0.3);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      throw this.handleError(error, "evaluating answer");
    }
  }
  /**
   * Evaluate a translation provided by a student
   */
  async evaluateTranslation(params: {
    original: string;
    userTranslation: string;
    targetLanguage: string;
  }): Promise<{
    isCorrect: boolean;
    feedback: string;
    correctedTranslation?: string;
  }> {
    try {
      const prompt = `
        Evaluate this translation:

        Original text: ${params.original}
        Student's translation to ${params.targetLanguage}: ${params.userTranslation}

        Determine if the translation is correct or acceptable. Consider:
        1. Meaning accuracy
        2. Grammar correctness
        3. Natural phrasing
        4. Cultural appropriateness

        Return JSON:
        {
          "isCorrect": true/false,
          "feedback": "brief feedback message",
          "correctedTranslation": "corrected version if incorrect, otherwise null"
        }
      `;

      const response = await this.generateCompletion(prompt, 'gpt-4o', 300, 0.3);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      throw this.handleError(error, "evaluating translation");
    }
  }

  /**
   * Fallback curriculum generation when Gemini is unavailable
   * Requirements: 18.4
   */
  async generateCurriculumFallback(params: {
    targetLanguage: string;
    nativeLanguage: string;
    proficiencyLevel: string;
  }): Promise<any> {
    try {
      const prompt = `
        Generate a language learning curriculum for ${params.targetLanguage}.
        
        Student Profile:
        - Target Language: ${params.targetLanguage}
        - Native Language: ${params.nativeLanguage}
        - Current Level: ${params.proficiencyLevel}
        
        Create at least 10 lessons with vocabulary, grammar, and cultural content.
        
        Return JSON format matching this structure:
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
                "vocabulary": [],
                "grammar": [],
                "culturalContent": []
              }
            ]
          }
        }
      `;

      const response = await this.generateCompletion(prompt, 'gpt-4o', 2000, 0.7);
      const jsonStr = response.replace(/```json|```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      throw this.handleError(error, "generating curriculum fallback");
    }
  }
}

export const openAIService = new OpenAIService();
