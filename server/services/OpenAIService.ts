import { BaseService } from "./BaseService";
import { openai } from "../openai";
import {
  generateExercise as generateExerciseUtil,
  generateLanguageTip as generateLanguageTipUtil,
  checkTranslation as checkTranslationUtil,
  generateStudyPlan as generateStudyPlanUtil
} from "../openai";

/**
 * Service class for handling OpenAI-related operations
 */
export class OpenAIService extends BaseService {
  /**
   * Generate an exercise for a specific language and level
   */
  async generateExercise(
    language: string, 
    level: string, 
    type: string
  ): Promise<{
    question: string;
    answer: string;
    options?: string[];
  }> {
    try {
      return await generateExerciseUtil(language, level, type);
    } catch (error) {
      this.handleError(error, "OpenAIService.generateExercise");
      // Provide a fallback response in case of error
      return {
        question: `Default ${type} question for ${language} at ${level} level.`,
        answer: "Default answer",
        options: type === "multiple-choice" ? ["Option 1", "Option 2", "Option 3", "Option 4"] : undefined
      };
    }
  }

  /**
   * Generate a language tip
   */
  async generateLanguageTip(language: string): Promise<string> {
    try {
      return await generateLanguageTipUtil(language);
    } catch (error) {
      this.handleError(error, "OpenAIService.generateLanguageTip");
      return `Here's a tip for learning ${language}: Practice every day, even if just for a few minutes.`;
    }
  }

  /**
   * Check a translation
   */
  async checkTranslation(
    original: string, 
    translation: string, 
    language: string
  ): Promise<{
    isCorrect: boolean;
    feedback: string;
    correctedTranslation?: string;
  }> {
    try {
      return await checkTranslationUtil(original, translation, language);
    } catch (error) {
      this.handleError(error, "OpenAIService.checkTranslation");
      return {
        isCorrect: false,
        feedback: "We couldn't verify your translation. Please try again."
      };
    }
  }

  /**
   * Generate a personalized study plan
   */
  async generateStudyPlan(
    language: string, 
    level: string, 
    interests: string[], 
    timeAvailable: number
  ): Promise<{
    title: string;
    description: string;
    activities: Array<{
      name: string;
      duration: number;
      description: string;
      type: string;
    }>;
  }> {
    try {
      return await generateStudyPlanUtil(language, level, interests, timeAvailable);
    } catch (error) {
      this.handleError(error, "OpenAIService.generateStudyPlan");
      return {
        title: `${language} Learning Plan`,
        description: `A basic study plan for learning ${language} at ${level} level.`,
        activities: [
          {
            name: "Vocabulary Practice",
            duration: Math.floor(timeAvailable / 3),
            description: "Learn and practice new vocabulary words.",
            type: "vocabulary"
          },
          {
            name: "Grammar Review",
            duration: Math.floor(timeAvailable / 3),
            description: "Review key grammar concepts.",
            type: "grammar"
          },
          {
            name: "Listening Practice",
            duration: Math.floor(timeAvailable / 3),
            description: "Listen to native speakers and practice comprehension.",
            type: "listening"
          }
        ]
      };
    }
  }
}