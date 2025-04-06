import { BaseService } from './BaseService';
import OpenAI from 'openai';
import { openai } from '../openai';

/**
 * Service for interacting with OpenAI API
 */
export class OpenAIService extends BaseService {
  private openai: OpenAI;
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
   * @param prompt The text prompt to complete
   * @param model The OpenAI model to use (defaults to 'gpt-3.5-turbo')
   * @param maxTokens Maximum tokens to generate
   * @param temperature Sampling temperature (0-2, higher = more random)
   * @returns Generated text
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
   * Generate a chat completion (conversation response)
   * @param messages Array of conversation messages
   * @param model The OpenAI model to use (defaults to 'gpt-3.5-turbo')
   * @param maxTokens Maximum tokens to generate
   * @param temperature Sampling temperature (0-2, higher = more random)
   * @returns Generated response
   */
  async generateChatCompletion(
    messages: { role: string; content: string }[],
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
  async generateExercise(language: string, level: string, type: string): Promise<{
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }> {
    try {
      const prompt = `
      Create a ${level} level ${type} exercise for learning ${language}.
      
      The exercise should include:
      1. A clear question or prompt
      2. The correct answer
      3. A brief explanation of why it's correct
      ${type === 'multiple-choice' ? '4. Four options to choose from (including the correct one)' : ''}
      
      Format the response as a JSON object with these fields:
      - question: the exercise question or prompt
      - options: an array of possible answers (only for multiple-choice)
      - correctAnswer: the correct answer
      - explanation: brief explanation of the correct answer
      
      Ensure the difficulty is appropriate for ${level} level learners.
      `;
      
      const completion = await this.generateCompletion(prompt, 'gpt-4', 800, 0.7);
      
      try {
        // Try to parse the completion as JSON
        const result = JSON.parse(completion);
        
        // Validate the result has the required fields
        if (!result.question || !result.correctAnswer || !result.explanation) {
          throw new Error('Missing required fields in response');
        }
        
        // For multiple choice, ensure options are present
        if (type === 'multiple-choice' && (!result.options || !Array.isArray(result.options) || result.options.length < 2)) {
          throw new Error('Missing or invalid options for multiple-choice exercise');
        }
        
        return result;
      } catch (parseError) {
        // If the response isn't valid JSON, create a structured response manually
        return {
          question: "What time is it?",
          correctAnswer: "I don't know, you tell me!",
          explanation: "This is a fallback exercise due to an error in parsing the AI response.",
          options: type === 'multiple-choice' ? ["Option A", "Option B", "Option C", "Option D"] : undefined
        };
      }
    } catch (error) {
      throw this.handleError(error, "generating exercise");
    }
  }
  
  /**
   * Generate a language learning tip
   */
  async generateLanguageTip(language: string): Promise<string> {
    try {
      const prompt = `
      Provide a useful and interesting tip for someone learning ${language}.
      
      The tip should:
      1. Be practical and immediately applicable
      2. Focus on a specific aspect of the language (pronunciation, grammar, vocabulary, etc.)
      3. Include a brief example
      4. Be concise (1-3 sentences)
      
      Format it as a single paragraph in a friendly, encouraging tone.
      `;
      
      return await this.generateCompletion(prompt, 'gpt-3.5-turbo', 150, 0.7);
    } catch (error) {
      throw this.handleError(error, "generating language tip");
    }
  }
  
  /**
   * Check the accuracy of a user's translation
   */
  async checkTranslation(original: string, translation: string, language: string): Promise<{
    isCorrect: boolean;
    feedback: string;
    suggestedTranslation?: string;
  }> {
    try {
      const prompt = `
      Evaluate this translation from ${language === 'english' ? language + ' to another language' : 'another language to ' + language}:
      
      Original: "${original}"
      Translation: "${translation}"
      
      Please analyze:
      1. Is the translation correct or mostly correct? (true/false)
      2. Provide specific feedback on the translation quality, focusing on any errors
      3. If there are errors, provide a better translation
      
      Format the response as a JSON object with these fields:
      - isCorrect: boolean indicating if the translation is correct or mostly correct
      - feedback: specific feedback on the translation
      - suggestedTranslation: a better translation if applicable (only if isCorrect is false)
      `;
      
      const completion = await this.generateCompletion(prompt, 'gpt-4', 500, 0.3);
      
      try {
        // Try to parse the completion as JSON
        const result = JSON.parse(completion);
        
        // Validate the result has the required fields
        if (typeof result.isCorrect !== 'boolean' || !result.feedback) {
          throw new Error('Missing required fields in response');
        }
        
        return result;
      } catch (parseError) {
        // If the response isn't valid JSON, create a structured response manually
        return {
          isCorrect: false,
          feedback: "I couldn't properly evaluate this translation. Please try again with a different phrase.",
          suggestedTranslation: "N/A"
        };
      }
    } catch (error) {
      throw this.handleError(error, "checking translation");
    }
  }
  
  /**
   * Generate a personalized study plan
   */
  async generateStudyPlan(
    language: string,
    level: string,
    goal: string,
    timeAvailable: number
  ): Promise<string> {
    try {
      const prompt = `
      Create a personalized ${language} language study plan with these parameters:
      
      - Student's current level: ${level}
      - Learning goal: ${goal}
      - Available time: ${timeAvailable} minutes per day
      
      The study plan should include:
      1. A weekly schedule with specific activities for each day
      2. A breakdown of time allocation (e.g., vocabulary, grammar, listening, etc.)
      3. Specific focus areas based on the student's level and goal
      4. Recommended resources (general types, not specific websites)
      
      Format it as a clear, structured plan with sections and bullet points.
      `;
      
      return await this.generateCompletion(prompt, 'gpt-4', 1000, 0.7);
    } catch (error) {
      throw this.handleError(error, "generating study plan");
    }
  }
}