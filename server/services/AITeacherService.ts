import { BaseService } from './BaseService';
import { GeminiService } from './GeminiService';
import { sessionContextService } from './SessionContextService';
import { db } from '../db';
import { aiSessionContexts } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';

const geminiService = new GeminiService();

/**
 * AI Teacher Service for intelligent tutoring and question answering
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
export class AITeacherService extends BaseService {
  constructor() {
    super();
    this.log("AITeacherService initialized", "info");
  }

  /**
   * Answer a student's question with contextual explanation
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.6
   */
  async answerQuestion(params: {
    question: string;
    sessionId: string;
    context: any;
    proficiencyLevel: string;
  }): Promise<{
    answer: string;
    explanation: string;
    examples: string[];
    culturalNotes?: string[];
    etiquetteRules?: string[];
    commonMistakes?: string[];
    relatedConcepts: string[];
    practiceExercises: string[];
  }> {
    try {
      this.log(`Answering question for session ${params.sessionId}`, "info");

      // Get conversation history for context using SessionContextService
      const conversationHistory = await sessionContextService.getConversationHistory(
        params.sessionId,
        5 // Last 5 messages for context
      );

      // Use Gemini to generate explanation
      const response = await geminiService.explainConcept({
        question: params.question,
        context: {
          ...params.context,
          conversationHistory
        },
        proficiencyLevel: params.proficiencyLevel
      });

      // Update conversation context using SessionContextService
      await sessionContextService.addMessageToHistory(params.sessionId, {
        role: 'user',
        content: params.question
      });

      await sessionContextService.addMessageToHistory(params.sessionId, {
        role: 'assistant',
        content: response.explanation
      });

      this.log("Question answered successfully", "info");

      return {
        answer: response.explanation,
        explanation: response.explanation,
        examples: response.examples || [],
        culturalNotes: response.culturalNotes || [],
        etiquetteRules: response.etiquetteRules || [],
        commonMistakes: response.commonMistakes || [],
        relatedConcepts: response.relatedConcepts || [],
        practiceExercises: response.practiceExercises || []
      };
    } catch (error) {
      throw this.handleError(error, "AITeacherService.answerQuestion");
    }
  }

  /**
   * Maintain conversation context for continuity
   * Requirements: 9.5
   * @deprecated Use sessionContextService.addMessageToHistory instead
   */
  async maintainContext(sessionId: string, message: {
    role: string;
    content: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      this.log(`Maintaining context for session ${sessionId}`, "info");

      // Delegate to SessionContextService
      await sessionContextService.addMessageToHistory(sessionId, {
        role: message.role as 'user' | 'assistant' | 'system',
        content: message.content
      });

      this.log("Context maintained successfully", "info");
    } catch (error) {
      throw this.handleError(error, "AITeacherService.maintainContext");
    }
  }

  /**
   * Get conversation history for a session
   * Requirements: 9.7
   */
  async getConversationHistory(sessionId: string): Promise<Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>> {
    try {
      this.log(`Retrieving conversation history for session ${sessionId}`, "info");

      // Delegate to SessionContextService
      const history = await sessionContextService.getConversationHistory(sessionId);
      
      return history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      throw this.handleError(error, "AITeacherService.getConversationHistory");
    }
  }

  /**
   * Clear context for session cleanup
   * Requirements: 9.7
   * @deprecated Sessions are now managed by SessionContextService
   */
  async clearContext(sessionId: string): Promise<void> {
    try {
      this.log(`Clearing context for session ${sessionId}`, "info");

      await db.update(aiSessionContexts)
        .set({
          conversationHistory: [],
          lastActivityAt: new Date()
        })
        .where(eq(aiSessionContexts.id, sessionId));

      this.log("Context cleared successfully", "info");
    } catch (error) {
      throw this.handleError(error, "AITeacherService.clearContext");
    }
  }

  /**
   * Create a new AI tutor session
   * Requirements: 22.1
   */
  async createSession(params: {
    userId: string;
    sessionType: string;
    learningContext: any;
    expirationHours?: number;
  }): Promise<string> {
    try {
      this.log(`Creating new session for user ${params.userId}`, "info");

      // Delegate to SessionContextService
      const result = await sessionContextService.createSessionContext({
        userId: params.userId,
        sessionType: params.sessionType as 'tutor' | 'voice' | 'general',
        learningContext: params.learningContext,
        expirationHours: params.expirationHours
      });

      this.log(`Session created with ID: ${result.sessionId}`, "info");

      return result.sessionId;
    } catch (error) {
      throw this.handleError(error, "AITeacherService.createSession");
    }
  }

  /**
   * Get active session or create new one
   */
  async getOrCreateSession(params: {
    userId: string;
    sessionType: string;
    learningContext: any;
  }): Promise<string> {
    try {
      // Delegate to SessionContextService
      return await sessionContextService.getOrCreateSessionContext({
        userId: params.userId,
        sessionType: params.sessionType as 'tutor' | 'voice' | 'general',
        learningContext: params.learningContext
      });
    } catch (error) {
      throw this.handleError(error, "AITeacherService.getOrCreateSession");
    }
  }

  /**
   * Get session by ID
   */
  private async getSession(sessionId: string): Promise<any> {
    try {
      const session = await db.query.aiSessionContexts.findFirst({
        where: eq(aiSessionContexts.id, sessionId)
      });

      return session;
    } catch (error) {
      throw this.handleError(error, "AITeacherService.getSession");
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      this.log("Cleaning up expired sessions", "info");

      // Delegate to SessionContextService
      const result = await sessionContextService.cleanupExpiredSessions();

      this.log(`Cleaned up ${result.deletedCount} expired sessions`, "info");

      return result.deletedCount;
    } catch (error) {
      throw this.handleError(error, "AITeacherService.cleanupExpiredSessions");
    }
  }
}

export const aiTeacherService = new AITeacherService();
