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
}
