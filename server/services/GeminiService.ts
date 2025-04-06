import { BaseService } from "./BaseService";
import fetch from "node-fetch";

/**
 * Service class for handling Gemini AI API operations
 */
export class GeminiService extends BaseService {
  private apiKey: string;
  private baseUrl: string = "https://generativelanguage.googleapis.com/v1beta";
  private model: string = "gemini-2.0-flash";

  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      console.warn("GEMINI_API_KEY not set. Gemini API features will be unavailable.");
    }
  }

  /**
   * Generate a response from Gemini API
   * @param prompt The text prompt to send to Gemini
   * @returns The generated response text
   */
  async generateContent(prompt: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error("GEMINI_API_KEY not set");
      }

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${errorText}`);
      }

      const data = await response.json() as any;
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from Gemini API");
      }
      
      // Extract the text from the first candidate's response
      const generatedText = data.candidates[0].content.parts[0].text;
      return generatedText;
    } catch (error) {
      this.handleError(error, "GeminiService.generateContent");
      return "I couldn't generate content at this time. Please try again later.";
    }
  }

  /**
   * Provide feedback on pronunciation
   * @param language Target language
   * @param originalText The text that should be pronounced
   * @param audioTranscription Transcription of the user's pronunciation
   * @returns Feedback on pronunciation accuracy and tips for improvement
   */
  async providePronunciationFeedback(
    language: string,
    originalText: string,
    audioTranscription: string
  ): Promise<{
    accuracy: number;
    feedback: string;
    improvementTips: string[];
  }> {
    try {
      const prompt = `
        You are a language pronunciation expert for ${language}. 
        
        Original text: "${originalText}"
        User's pronunciation (transcribed): "${audioTranscription}"
        
        Please evaluate the pronunciation accuracy and provide feedback.
        
        Format your response as JSON with the following structure:
        {
          "accuracy": [number between 0-100],
          "feedback": [brief overall assessment],
          "improvementTips": [array of specific tips for improvement]
        }
      `;

      const response = await this.generateContent(prompt);
      
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse pronunciation feedback");
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.handleError(error, "GeminiService.providePronunciationFeedback");
      return {
        accuracy: 0,
        feedback: "Unable to evaluate pronunciation at this time",
        improvementTips: ["Try again later"]
      };
    }
  }

  /**
   * Generate a personalized learning path
   * @param language Target language
   * @param currentLevel User's current level
   * @param learningGoals User's learning goals
   * @param interests User's interests
   * @returns Personalized learning path with milestones
   */
  async generateLearningPath(
    language: string,
    currentLevel: string,
    learningGoals: string[],
    interests: string[]
  ): Promise<{
    overview: string;
    milestones: Array<{
      title: string;
      description: string;
      estimatedTimeToComplete: string;
      skills: string[];
    }>;
  }> {
    try {
      const prompt = `
        Create a personalized learning path for learning ${language}.
        
        Current level: ${currentLevel}
        Learning goals: ${learningGoals.join(", ")}
        Personal interests: ${interests.join(", ")}
        
        The learning path should be motivating, realistic, and tailored to the user's needs.
        
        Format your response as JSON with the following structure:
        {
          "overview": [brief description of the overall learning journey],
          "milestones": [
            {
              "title": [milestone title],
              "description": [detailed description],
              "estimatedTimeToComplete": [time estimate as string],
              "skills": [array of skills gained]
            },
            ...
          ]
        }
      `;

      const response = await this.generateContent(prompt);
      
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse learning path");
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.handleError(error, "GeminiService.generateLearningPath");
      return {
        overview: "A personalized learning path could not be generated at this time.",
        milestones: [
          {
            title: "Basic Communication",
            description: "Learn fundamental phrases and expressions",
            estimatedTimeToComplete: "2-3 weeks",
            skills: ["Basic vocabulary", "Simple greetings", "Numbers and time"]
          }
        ]
      };
    }
  }

  /**
   * Get language mascot dialogue
   * @param language Target language
   * @param context Current learning context
   * @param userProgress User's current progress
   * @returns Mascot dialogue and cultural tips
   */
  async getLanguageMascotDialogue(
    language: string,
    context: string,
    userProgress: {
      level: string;
      recentTopics: string[];
      streakDays: number;
    }
  ): Promise<{
    dialogue: string;
    culturalTip: string;
    encouragement: string;
  }> {
    try {
      const prompt = `
        You are a friendly mascot for ${language} learning named Lingo. 
        Your personality is encouraging, supportive, and knowledgeable about the culture.
        
        Current context: ${context}
        User's level: ${userProgress.level}
        Recent topics: ${userProgress.recentTopics.join(", ")}
        Streak days: ${userProgress.streakDays}
        
        Provide a dialogue with the user that includes:
        1. A brief greeting
        2. An interesting cultural tip related to their recent topics
        3. Encouragement that references their streak
        
        Format your response as JSON with the following structure:
        {
          "dialogue": [friendly greeting and interaction],
          "culturalTip": [interesting cultural tip related to recent topics],
          "encouragement": [positive encouragement about their streak or progress]
        }
      `;

      const response = await this.generateContent(prompt);
      
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse mascot dialogue");
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.handleError(error, "GeminiService.getLanguageMascotDialogue");
      return {
        dialogue: "¡Hola! I'm Lingo, your language learning companion!",
        culturalTip: "Did you know? Language learning is not just about words, but also about culture.",
        encouragement: "You're making great progress! Keep up the good work!"
      };
    }
  }
}