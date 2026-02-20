import { BaseService } from "./BaseService";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService extends BaseService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    super();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateContent(prompt: string): Promise<string> {
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

  async generateCulturalContent(language: string, topic: string, level: string): Promise<any> {
    const prompt = `Provide cultural insight about "${topic}" for ${language} learners at ${level} level. Return JSON: {title: string, content: string}.`;
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
}

export const geminiService = new GeminiService();
