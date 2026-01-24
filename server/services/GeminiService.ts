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
}

export const geminiService = new GeminiService();
