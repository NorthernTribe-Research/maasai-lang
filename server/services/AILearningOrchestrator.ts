import { BaseService } from "./BaseService";
import { geminiService } from "./GeminiService";

export class AILearningOrchestrator extends BaseService {
  constructor() {
    super();
  }

  async determineNextLearningActivity(userId: string, languageId: number, userProfile: any): Promise<any> {
    const prompt = `Analyze user profile ${JSON.stringify(userProfile)} for language ${languageId}. Determine next activity. Return JSON: {activityType, topic, difficulty, learningObjectives, aiTeacherPersona, estimatedDuration}.`;
    const res = await geminiService.generateContent(prompt);
    return JSON.parse(res.replace(/```json|```/g, "").trim());
  }

  async analyzeUserResponse(sessionId: string, userId: string, languageId: number, data: any): Promise<any> {
    return geminiService.analyzeUserResponse(data.userResponse, { sessionId, userId, languageId, history: data.conversationHistory });
  }

  async generateAILearningSession(userId: string, languageId: number, languageName: string, type: string, topic: string, diff: string, profile: any): Promise<any> {
    const prompt = `Generate ${type} for ${languageName} on ${topic} (${diff}) for user ${JSON.stringify(profile)}. Return JSON with interactionFlow.`;
    const res = await geminiService.generateContent(prompt);
    return JSON.parse(res.replace(/```json|```/g, "").trim());
  }
}

export const aiLearningOrchestrator = new AILearningOrchestrator();
