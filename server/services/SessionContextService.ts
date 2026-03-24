import { BaseService } from './BaseService';
import { db } from '../db';
import { aiSessionContexts, voiceSessions, AISessionContext } from '../../shared/schema';
import { eq, and, gt, lt, desc } from 'drizzle-orm';

/**
 * Session Context Service for managing AI session contexts
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6
 */
export class SessionContextService extends BaseService {
  private readonly DEFAULT_EXPIRATION_HOURS = 24;
  private readonly MAX_HISTORY_LENGTH = 100;

  constructor() {
    super();
    this.log("SessionContextService initialized", "info");
  }

  /**
   * Create a new session context
   * Requirements: 22.1
   */
  async createSessionContext(params: {
    userId: string;
    sessionType: 'tutor' | 'voice' | 'general';
    learningContext: {
      profileId?: string;
      currentLesson?: string;
      recentTopics?: string[];
      weaknesses?: any[];
      proficiencyLevel?: string;
      targetLanguage?: string;
      nativeLanguage?: string;
    };
    expirationHours?: number;
  }): Promise<{
    sessionId: string;
    expiresAt: Date;
  }> {
    try {
      this.log(`Creating session context for user ${params.userId}`, "info");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (params.expirationHours || this.DEFAULT_EXPIRATION_HOURS));

      const [session] = await db.insert(aiSessionContexts)
        .values({
          userId: params.userId,
          sessionType: params.sessionType,
          conversationHistory: [],
          learningContext: params.learningContext,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt
        })
        .returning();

      this.log(`Session context created with ID: ${session.id}`, "info");

      return {
        sessionId: session.id,
        expiresAt: session.expiresAt
      };
    } catch (error) {
      throw this.handleError(error, "SessionContextService.createSessionContext");
    }
  }

  /**
   * Get or create an active session context
   * Requirements: 22.1
   */
  async getOrCreateSessionContext(params: {
    userId: string;
    sessionType: 'tutor' | 'voice' | 'general';
    learningContext: any;
  }): Promise<string> {
    try {
      this.log(`Getting or creating session context for user ${params.userId}`, "info");

      // Check for active session
      const activeSessions = await db.query.aiSessionContexts.findMany({
        where: and(
          eq(aiSessionContexts.userId, params.userId),
          eq(aiSessionContexts.sessionType, params.sessionType),
          gt(aiSessionContexts.expiresAt, new Date())
        ),
        orderBy: [desc(aiSessionContexts.lastActivityAt)],
        limit: 1
      });

      if (activeSessions.length > 0) {
        this.log(`Found active session: ${activeSessions[0].id}`, "info");
        return activeSessions[0].id;
      }

      // Create new session if none active
      const result = await this.createSessionContext(params);
      return result.sessionId;
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getOrCreateSessionContext");
    }
  }

  /**
   * Add a message to the conversation history
   * Requirements: 22.2
   */
  async addMessageToHistory(
    sessionId: string,
    message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      this.log(`Adding message to session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        throw new Error(`Session ${sessionId} has expired`);
      }

      const conversationHistory = (session.conversationHistory as any[]) || [];
      
      // Add new message with timestamp
      conversationHistory.push({
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString(),
        metadata: message.metadata
      });

      // Trim history if it exceeds max length
      const trimmedHistory = conversationHistory.length > this.MAX_HISTORY_LENGTH
        ? conversationHistory.slice(-this.MAX_HISTORY_LENGTH)
        : conversationHistory;

      // Update session
      await db.update(aiSessionContexts)
        .set({
          conversationHistory: trimmedHistory,
          lastActivityAt: new Date()
        })
        .where(eq(aiSessionContexts.id, sessionId));

      this.log("Message added to conversation history", "info");
    } catch (error) {
      throw this.handleError(error, "SessionContextService.addMessageToHistory");
    }
  }

  /**
   * Get conversation history for a session
   * Requirements: 22.2, 22.5
   */
  async getConversationHistory(
    sessionId: string,
    limit?: number
  ): Promise<Array<{
    role: string;
    content: string;
    timestamp: string;
    metadata?: any;
  }>> {
    try {
      this.log(`Retrieving conversation history for session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        return [];
      }

      const conversationHistory = (session.conversationHistory as any[]) || [];

      // Return limited history if specified
      if (limit && limit > 0) {
        return conversationHistory.slice(-limit);
      }

      return conversationHistory;
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getConversationHistory");
    }
  }

  /**
   * Store session transcript on session end
   * Requirements: 22.3, 22.4
   */
  async storeSessionTranscript(
    sessionId: string,
    summary?: {
      totalMessages: number;
      duration: number;
      topics: string[];
      keyPoints: string[];
    }
  ): Promise<{
    transcriptId: string;
    messageCount: number;
  }> {
    try {
      this.log(`Storing transcript for session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const conversationHistory = (session.conversationHistory as any[]) || [];
      
      // Update session with summary metadata
      const currentContext = (session.learningContext as any) || {};
      const updatedLearningContext = {
        ...currentContext,
        sessionSummary: summary,
        transcriptStored: true,
        storedAt: new Date().toISOString()
      };

      await db.update(aiSessionContexts)
        .set({
          learningContext: updatedLearningContext,
          lastActivityAt: new Date()
        })
        .where(eq(aiSessionContexts.id, sessionId));

      this.log(`Transcript stored for session ${sessionId}`, "info");

      return {
        transcriptId: sessionId,
        messageCount: conversationHistory.length
      };
    } catch (error) {
      throw this.handleError(error, "SessionContextService.storeSessionTranscript");
    }
  }

  /**
   * Get past session transcripts for a user
   * Requirements: 22.5
   */
  async getPastTranscripts(
    userId: string,
    options?: {
      sessionType?: 'tutor' | 'voice' | 'general';
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Array<{
    sessionId: string;
    sessionType: string;
    startedAt: Date;
    lastActivityAt: Date;
    messageCount: number;
    summary?: any;
    conversationHistory: any[];
  }>> {
    try {
      this.log(`Retrieving past transcripts for user ${userId}`, "info");

      // Build query conditions
      const conditions = [eq(aiSessionContexts.userId, userId)];
      
      if (options?.sessionType) {
        conditions.push(eq(aiSessionContexts.sessionType, options.sessionType));
      }

      if (options?.startDate) {
        conditions.push(gt(aiSessionContexts.startedAt, options.startDate));
      }

      if (options?.endDate) {
        conditions.push(lt(aiSessionContexts.startedAt, options.endDate));
      }

      const sessions = await db.query.aiSessionContexts.findMany({
        where: and(...conditions),
        orderBy: [desc(aiSessionContexts.startedAt)],
        limit: options?.limit || 20,
        offset: options?.offset || 0
      });

      const transcripts = sessions.map(session => {
        const conversationHistory = (session.conversationHistory as any[]) || [];
        const learningContext = session.learningContext as any;
        
        return {
          sessionId: session.id,
          sessionType: session.sessionType,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
          messageCount: conversationHistory.length,
          summary: learningContext?.sessionSummary,
          conversationHistory
        };
      });

      this.log(`Retrieved ${transcripts.length} transcripts`, "info");

      return transcripts;
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getPastTranscripts");
    }
  }

  /**
   * Get a specific session transcript
   * Requirements: 22.5
   */
  async getSessionTranscript(sessionId: string): Promise<{
    sessionId: string;
    sessionType: string;
    startedAt: Date;
    lastActivityAt: Date;
    expiresAt: Date;
    conversationHistory: any[];
    learningContext: any;
    messageCount: number;
  } | null> {
    try {
      this.log(`Retrieving transcript for session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        return null;
      }

      const conversationHistory = (session.conversationHistory as any[]) || [];

      return {
        sessionId: session.id,
        sessionType: session.sessionType,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        conversationHistory,
        learningContext: session.learningContext,
        messageCount: conversationHistory.length
      };
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getSessionTranscript");
    }
  }

  /**
   * Update session learning context
   * Requirements: 22.2
   */
  async updateLearningContext(
    sessionId: string,
    contextUpdates: Partial<any>
  ): Promise<void> {
    try {
      this.log(`Updating learning context for session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const currentContext = (session.learningContext as any) || {};
      const updatedContext = {
        ...currentContext,
        ...contextUpdates
      };

      await db.update(aiSessionContexts)
        .set({
          learningContext: updatedContext,
          lastActivityAt: new Date()
        })
        .where(eq(aiSessionContexts.id, sessionId));

      this.log("Learning context updated", "info");
    } catch (error) {
      throw this.handleError(error, "SessionContextService.updateLearningContext");
    }
  }

  /**
   * Extend session expiration
   * Requirements: 22.6
   */
  async extendSessionExpiration(
    sessionId: string,
    additionalHours: number
  ): Promise<Date> {
    try {
      this.log(`Extending expiration for session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const newExpiresAt = new Date(session.expiresAt);
      newExpiresAt.setHours(newExpiresAt.getHours() + additionalHours);

      await db.update(aiSessionContexts)
        .set({
          expiresAt: newExpiresAt,
          lastActivityAt: new Date()
        })
        .where(eq(aiSessionContexts.id, sessionId));

      this.log(`Session expiration extended to ${newExpiresAt}`, "info");

      return newExpiresAt;
    } catch (error) {
      throw this.handleError(error, "SessionContextService.extendSessionExpiration");
    }
  }

  /**
   * Clean up expired sessions
   * Requirements: 22.6
   */
  async cleanupExpiredSessions(): Promise<{
    deletedCount: number;
    archivedCount: number;
  }> {
    try {
      this.log("Cleaning up expired sessions", "info");

      const now = new Date();

      // Find expired sessions
      const expiredSessions = await db.query.aiSessionContexts.findMany({
        where: lt(aiSessionContexts.expiresAt, now)
      });

      // Archive sessions with conversation history before deletion
      let archivedCount = 0;
      for (const session of expiredSessions) {
        const conversationHistory = (session.conversationHistory as any[]) || [];
        if (conversationHistory.length > 0) {
          // Mark as archived in learning context
          const currentContext = (session.learningContext as any) || {};
          await db.update(aiSessionContexts)
            .set({
              learningContext: {
                ...currentContext,
                archived: true,
                archivedAt: new Date().toISOString()
              }
            })
            .where(eq(aiSessionContexts.id, session.id));
          archivedCount++;
        }
      }

      // Delete expired sessions (or keep archived ones based on policy)
      await db.delete(aiSessionContexts)
        .where(lt(aiSessionContexts.expiresAt, now));

      const deletedCount = expiredSessions.length;
      this.log(`Cleaned up ${deletedCount} expired sessions (${archivedCount} archived)`, "info");

      return {
        deletedCount,
        archivedCount
      };
    } catch (error) {
      throw this.handleError(error, "SessionContextService.cleanupExpiredSessions");
    }
  }

  /**
   * Get active sessions for a user
   * Requirements: 22.6
   */
  async getActiveSessions(userId: string): Promise<Array<{
    sessionId: string;
    sessionType: string;
    startedAt: Date;
    lastActivityAt: Date;
    expiresAt: Date;
    messageCount: number;
  }>> {
    try {
      this.log(`Retrieving active sessions for user ${userId}`, "info");

      const sessions = await db.query.aiSessionContexts.findMany({
        where: and(
          eq(aiSessionContexts.userId, userId),
          gt(aiSessionContexts.expiresAt, new Date())
        ),
        orderBy: [desc(aiSessionContexts.lastActivityAt)]
      });

      return sessions.map(session => {
        const conversationHistory = (session.conversationHistory as any[]) || [];
        return {
          sessionId: session.id,
          sessionType: session.sessionType,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
          expiresAt: session.expiresAt,
          messageCount: conversationHistory.length
        };
      });
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getActiveSessions");
    }
  }

  /**
   * End a session (mark as complete and store transcript)
   * Requirements: 22.3, 22.4
   */
  async endSession(
    sessionId: string,
    summary?: {
      totalMessages: number;
      duration: number;
      topics: string[];
      keyPoints: string[];
      performance?: any;
    }
  ): Promise<{
    sessionId: string;
    messageCount: number;
    duration: number;
  }> {
    try {
      this.log(`Ending session ${sessionId}`, "info");

      const session = await this.getSessionContext(sessionId);
      
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const conversationHistory = (session.conversationHistory as any[]) || [];
      const duration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

      // Store transcript with summary
      await this.storeSessionTranscript(sessionId, {
        totalMessages: conversationHistory.length,
        duration,
        topics: summary?.topics || [],
        keyPoints: summary?.keyPoints || []
      });

      // Mark session as ended by setting expiration to now
      await db.update(aiSessionContexts)
        .set({
          expiresAt: new Date(),
          lastActivityAt: new Date()
        })
        .where(eq(aiSessionContexts.id, sessionId));

      this.log(`Session ${sessionId} ended`, "info");

      return {
        sessionId,
        messageCount: conversationHistory.length,
        duration
      };
    } catch (error) {
      throw this.handleError(error, "SessionContextService.endSession");
    }
  }

  /**
   * Get session context by ID
   */
  private async getSessionContext(sessionId: string): Promise<AISessionContext | undefined> {
    try {
      const session = await db.query.aiSessionContexts.findFirst({
        where: eq(aiSessionContexts.id, sessionId)
      });

      return session;
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getSessionContext");
    }
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStatistics(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    averageSessionDuration: number;
    sessionsByType: { [key: string]: number };
  }> {
    try {
      this.log(`Retrieving session statistics for user ${userId}`, "info");

      const allSessions = await db.query.aiSessionContexts.findMany({
        where: eq(aiSessionContexts.userId, userId)
      });

      const activeSessions = allSessions.filter(
        session => new Date(session.expiresAt) > new Date()
      );

      let totalMessages = 0;
      let totalDuration = 0;
      const sessionsByType: { [key: string]: number } = {};

      for (const session of allSessions) {
        const conversationHistory = (session.conversationHistory as any[]) || [];
        totalMessages += conversationHistory.length;

        const duration = Math.floor(
          (new Date(session.lastActivityAt).getTime() - new Date(session.startedAt).getTime()) / 1000
        );
        totalDuration += duration;

        sessionsByType[session.sessionType] = (sessionsByType[session.sessionType] || 0) + 1;
      }

      const averageSessionDuration = allSessions.length > 0 
        ? Math.floor(totalDuration / allSessions.length)
        : 0;

      return {
        totalSessions: allSessions.length,
        activeSessions: activeSessions.length,
        totalMessages,
        averageSessionDuration,
        sessionsByType
      };
    } catch (error) {
      throw this.handleError(error, "SessionContextService.getSessionStatistics");
    }
  }
}

export const sessionContextService = new SessionContextService();
