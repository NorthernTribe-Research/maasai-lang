import { BaseService } from "./BaseService";
import { aiLearningOrchestrator } from "./AILearningOrchestrator";
import { GeminiService } from "./GeminiService";

interface ActiveSession {
  sessionId: string;
  userId: string;
  languageId: number;
  languageName: string;
  sessionType: string;
  topic: string;
  difficulty: string;
  startTime: Date;
  conversationHistory: Array<{ role: string; content: string; timestamp: Date }>;
  currentStep: number;
  totalSteps: number;
  performanceMetrics: {
    correctResponses: number;
    totalResponses: number;
    averageAccuracy: number;
    averageResponseTime: number;
  };
  adaptations: Array<{
    step: number;
    type: string;
    reason: string;
    timestamp: Date;
  }>;
  learningObjectives: string[];
  completedObjectives: string[];
}

/**
 * Intelligent Session Manager - Manages real-time AI-driven learning sessions
 * Handles conversation flow, adaptation, and performance tracking
 */
export class IntelligentSessionManager extends BaseService {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private geminiService: GeminiService;

  constructor() {
    super();
    this.geminiService = new GeminiService();
    this.log("Intelligent Session Manager initialized (Google AI Only)", "info");
  }

  /**
   * Start a new AI-driven learning session
   */
  async startSession(
    userId: string,
    languageId: number,
    languageName: string,
    userProfile: any,
    preferences?: {
      sessionType?: string;
      topic?: string;
      duration?: number;
    }
  ): Promise<{
    sessionId: string;
    sessionType: string;
    topic: string;
    difficulty: string;
    initialMessage: string;
    learningObjectives: string[];
    aiTeacherPersona: string;
    estimatedDuration: number;
  }> {
    try {
      // Determine what to teach
      const nextActivity = await aiLearningOrchestrator.determineNextLearningActivity(
        userId,
        languageId,
        userProfile
      );

      const sessionId = `session_${userId}_${Date.now()}`;

      // Generate session content
      const sessionData = await aiLearningOrchestrator.generateAILearningSession(
        userId,
        languageId,
        languageName,
        preferences?.sessionType || nextActivity.activityType,
        preferences?.topic || nextActivity.topic,
        nextActivity.difficulty,
        userProfile
      );

      // Create active session
      const session: ActiveSession = {
        sessionId,
        userId,
        languageId,
        languageName,
        sessionType: sessionData.sessionType,
        topic: nextActivity.topic,
        difficulty: nextActivity.difficulty,
        startTime: new Date(),
        conversationHistory: [],
        currentStep: 0,
        totalSteps: sessionData.interactionFlow?.length || 5,
        performanceMetrics: {
          correctResponses: 0,
          totalResponses: 0,
          averageAccuracy: 0,
          averageResponseTime: 0
        },
        adaptations: [],
        learningObjectives: nextActivity.learningObjectives,
        completedObjectives: []
      };

      this.activeSessions.set(sessionId, session);

      // Generate initial AI teacher message
      const initialMessage = await this.generateTeacherMessage(
        session,
        'start',
        nextActivity.topic,
        nextActivity.learningObjectives
      );

      session.conversationHistory.push({
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date()
      });

      return {
        sessionId,
        sessionType: session.sessionType,
        topic: session.topic,
        difficulty: session.difficulty,
        initialMessage,
        learningObjectives: session.learningObjectives,
        aiTeacherPersona: nextActivity.aiTeacherPersona || 'friendly',
        estimatedDuration: nextActivity.estimatedDuration
      };
    } catch (error) {
      throw this.handleError(error, "starting learning session");
    }
  }

  /**
   * Process user input and generate AI response
   */
  async processUserInput(
    sessionId: string,
    userMessage: string
  ): Promise<{
    aiResponse: string;
    feedback: string | null;
    isCorrect: boolean | null;
    accuracy: number | null;
    progressUpdate: {
      currentStep: number;
      totalSteps: number;
      completedObjectives: string[];
      overallProgress: number;
    };
    adaptations: string[];
    nextAction: 'continue' | 'complete' | 'assessment';
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Add user message to history
      const startTime = Date.now();
      session.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Analyze user response
      const analysis = await aiLearningOrchestrator.analyzeUserResponse(
        sessionId,
        session.userId,
        session.languageId,
        {
          currentStep: session.currentStep,
          expectedResponse: this.getExpectedResponse(session),
          userResponse: userMessage,
          conversationHistory: session.conversationHistory
        }
      );

      const responseTime = Date.now() - startTime;

      // Update performance metrics
      if (analysis.isCorrect !== null) {
        session.performanceMetrics.totalResponses++;
        if (analysis.isCorrect) {
          session.performanceMetrics.correctResponses++;
        }
        session.performanceMetrics.averageAccuracy =
          (session.performanceMetrics.correctResponses / session.performanceMetrics.totalResponses) * 100;
      }

      // Handle difficulty adaptation
      if (analysis.adaptation?.shouldAdjustDifficulty) {
        session.adaptations.push({
          step: session.currentStep,
          type: 'difficulty',
          reason: analysis.adaptation.reasoning,
          timestamp: new Date()
        });

        if (analysis.adaptation.newDifficulty) {
          session.difficulty = analysis.adaptation.newDifficulty;
        }
      }

      // Generate AI teacher response
      const aiResponse = await this.generateAdaptiveResponse(
        session,
        userMessage,
        analysis
      );

      session.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });

      // Update progress
      session.currentStep++;
      const overallProgress = (session.currentStep / session.totalSteps) * 100;

      // Determine next action
      const nextAction = this.determineNextAction(session, overallProgress);

      return {
        aiResponse,
        feedback: analysis.feedback,
        isCorrect: analysis.isCorrect,
        accuracy: analysis.accuracy,
        progressUpdate: {
          currentStep: session.currentStep,
          totalSteps: session.totalSteps,
          completedObjectives: session.completedObjectives,
          overallProgress
        },
        adaptations: session.adaptations.map(a => a.reason),
        nextAction
      };
    } catch (error) {
      throw this.handleError(error, "processing user input");
    }
  }

  /**
   * Get current session status
   */
  getSessionStatus(sessionId: string): {
    isActive: boolean;
    duration: number;
    progress: number;
    performanceMetrics: any;
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
    const progress = (session.currentStep / session.totalSteps) * 100;

    return {
      isActive: true,
      duration,
      progress,
      performanceMetrics: session.performanceMetrics
    };
  }

  /**
   * Complete a learning session
   */
  async completeSession(sessionId: string): Promise<{
    summary: {
      duration: number;
      totalInteractions: number;
      accuracy: number;
      completedObjectives: string[];
      xpEarned: number;
      feedback: string;
      nextRecommendation: string;
    };
    performanceData: any;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
      const xpEarned = this.calculateXP(session);

      // Generate session summary with AI
      const summary = await this.generateSessionSummary(session, duration, xpEarned);

      // Clean up
      this.activeSessions.delete(sessionId);

      return {
        summary: {
          duration,
          totalInteractions: session.conversationHistory.length,
          accuracy: session.performanceMetrics.averageAccuracy,
          completedObjectives: session.completedObjectives,
          xpEarned,
          feedback: summary.feedback,
          nextRecommendation: summary.nextRecommendation
        },
        performanceData: {
          metrics: session.performanceMetrics,
          adaptations: session.adaptations,
          conversationHistory: session.conversationHistory
        }
      };
    } catch (error) {
      throw this.handleError(error, "completing session");
    }
  }

  // Helper methods

  private async generateTeacherMessage(
    session: ActiveSession,
    type: 'start' | 'continue' | 'encourage',
    topic: string,
    objectives: string[]
  ): Promise<string> {
    try {
      const prompt = `You are a friendly AI language teacher. Generate a ${type} message for a ${session.languageName} learning session.

Topic: ${topic}
Difficulty: ${session.difficulty}
Learning Objectives: ${objectives.join(', ')}

Create a natural, encouraging message that:
1. ${type === 'start' ? 'Introduces the topic and objectives' : 'Continues the conversation naturally'}
2. Motivates the learner
3. Sets clear expectations
4. Is appropriate for ${session.difficulty} level

Return just the message text, no JSON.`;

      const content = await this.geminiService.generateContent(prompt);
      return content.trim();
    } catch (error) {
      this.handleError(error, "generating teacher message");
      return `Welcome! Let's practice ${topic} together. I'm here to help you learn ${session.languageName}. Ready to begin?`;
    }
  }

  private async generateAdaptiveResponse(
    session: ActiveSession,
    userMessage: string,
    analysis: any
  ): Promise<string> {
    try {
      const prompt = `
        As a Google-powered AI Language Teacher, analyze this response.
        Context: ${JSON.stringify(analysis)}
        User Message: "${userMessage}"
        Return a natural conversation response that provides feedback and continues the lesson.
      `;
      const result = await this.geminiService.generateContent(prompt);
      return result.trim();
    } catch (error) {
      this.handleError(error, "generating adaptive response");
      return this.getSimpleResponse(analysis);
    }
  }

  private getSimpleResponse(analysis: any): string {
    if (analysis.isCorrect) {
      return `${analysis.encouragement} ${analysis.nextStep}`;
    } else {
      return `${analysis.feedback} ${analysis.corrections?.join('. ') || ''} ${analysis.encouragement}`;
    }
  }

  private getExpectedResponse(session: ActiveSession): string {
    return 'continue';
  }

  private determineNextAction(session: ActiveSession, progress: number): 'continue' | 'complete' | 'assessment' {
    if (progress >= 90) return 'complete';
    if (session.currentStep % 5 === 0 && session.currentStep > 0) return 'assessment';
    return 'continue';
  }

  private calculateXP(session: ActiveSession): number {
    const baseXP = 10;
    const accuracyBonus = Math.floor(session.performanceMetrics.averageAccuracy / 10);
    const completionBonus = session.currentStep >= session.totalSteps ? 5 : 0;
    return baseXP + accuracyBonus + completionBonus;
  }

  private async generateSessionSummary(
    session: ActiveSession,
    duration: number,
    xpEarned: number
  ): Promise<{ feedback: string; nextRecommendation: string }> {
    try {
      const prompt = `Generate a session summary for a language learner.

Session Details:
- Topic: ${session.topic}
- Accuracy: ${session.performanceMetrics.averageAccuracy}%
- Duration: ${Math.floor(duration / 60)} minutes
- XP Earned: ${xpEarned}

Provide:
1. Encouraging feedback highlighting achievements
2. Next recommended activity

Return JSON: { "feedback": "...", "nextRecommendation": "..." }`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/\`\`\`json|\`\`\`/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.handleError(error, "generating session summary");
      return {
        feedback: `Great work! You completed the ${session.topic} session with ${Math.round(session.performanceMetrics.averageAccuracy)}% accuracy.`,
        nextRecommendation: 'Continue practicing to reinforce what you learned today.'
      };
    }
  }

  /**
   * Get all active sessions for a user
   */
  getUserActiveSessions(userId: string): string[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId)
      .map(session => session.sessionId);
  }

  /**
   * Cancel a session
   */
  cancelSession(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }
}

export const intelligentSessionManager = new IntelligentSessionManager();
