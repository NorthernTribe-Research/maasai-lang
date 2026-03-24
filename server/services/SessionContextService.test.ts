import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionContextService } from './SessionContextService';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      aiSessionContexts: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}));

describe('SessionContextService', () => {
  let service: SessionContextService;
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';

  beforeEach(() => {
    service = new SessionContextService();
    vi.clearAllMocks();
  });

  describe('createSessionContext', () => {
    it('should create a new session context with default expiration', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'tutor',
        conversationHistory: [],
        learningContext: { profileId: 'profile-123' },
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });

      const result = await service.createSessionContext({
        userId: mockUserId,
        sessionType: 'tutor',
        learningContext: { profileId: 'profile-123' },
      });

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should create a session with custom expiration hours', async () => {
      const customHours = 12;
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'voice',
        conversationHistory: [],
        learningContext: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + customHours * 60 * 60 * 1000),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });

      const result = await service.createSessionContext({
        userId: mockUserId,
        sessionType: 'voice',
        learningContext: {},
        expirationHours: customHours,
      });

      expect(result.sessionId).toBe(mockSessionId);
    });
  });

  describe('getOrCreateSessionContext', () => {
    it('should return existing active session if available', async () => {
      const mockActiveSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'tutor',
        conversationHistory: [],
        learningContext: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (db.query.aiSessionContexts.findMany as any).mockResolvedValue([mockActiveSession]);

      const result = await service.getOrCreateSessionContext({
        userId: mockUserId,
        sessionType: 'tutor',
        learningContext: {},
      });

      expect(result).toBe(mockSessionId);
    });

    it('should create new session if no active session exists', async () => {
      (db.query.aiSessionContexts.findMany as any).mockResolvedValue([]);

      const mockNewSession = {
        id: 'new-session-789',
        userId: mockUserId,
        sessionType: 'general',
        conversationHistory: [],
        learningContext: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNewSession]),
        }),
      });

      const result = await service.getOrCreateSessionContext({
        userId: mockUserId,
        sessionType: 'general',
        learningContext: {},
      });

      expect(result).toBe('new-session-789');
    });
  });

  describe('addMessageToHistory', () => {
    it('should add a message to conversation history', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'tutor',
        conversationHistory: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
        ],
        learningContext: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockSession);
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      await service.addMessageToHistory(mockSessionId, {
        role: 'assistant',
        content: 'Hi there!',
      });

      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error if session is expired', async () => {
      const mockExpiredSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'tutor',
        conversationHistory: [],
        learningContext: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockExpiredSession);

      await expect(
        service.addMessageToHistory(mockSessionId, {
          role: 'user',
          content: 'Test',
        })
      ).rejects.toThrow('has expired');
    });

    it('should trim history if it exceeds max length', async () => {
      const longHistory = Array.from({ length: 150 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'tutor',
        conversationHistory: longHistory,
        learningContext: {},
        startedAt: new Date(),
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockSession);

      let capturedHistory: any[] = [];
      (db.update as any).mockReturnValue({
        set: vi.fn().mockImplementation((data) => {
          capturedHistory = data.conversationHistory;
          return {
            where: vi.fn().mockResolvedValue(undefined),
          };
        }),
      });

      await service.addMessageToHistory(mockSessionId, {
        role: 'user',
        content: 'New message',
      });

      expect(capturedHistory.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getConversationHistory', () => {
    it('should return full conversation history', async () => {
      const mockHistory = [
        { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Hi!', timestamp: new Date().toISOString() },
      ];

      const mockSession = {
        id: mockSessionId,
        conversationHistory: mockHistory,
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockSession);

      const result = await service.getConversationHistory(mockSessionId);

      expect(result).toEqual(mockHistory);
      expect(result.length).toBe(2);
    });

    it('should return limited conversation history when limit is specified', async () => {
      const mockHistory = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const mockSession = {
        id: mockSessionId,
        conversationHistory: mockHistory,
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockSession);

      const result = await service.getConversationHistory(mockSessionId, 5);

      expect(result.length).toBe(5);
    });

    it('should return empty array if session not found', async () => {
      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(undefined);

      const result = await service.getConversationHistory('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('storeSessionTranscript', () => {
    it('should store session transcript with summary', async () => {
      const mockSession = {
        id: mockSessionId,
        conversationHistory: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Hi!', timestamp: new Date().toISOString() },
        ],
        learningContext: {},
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockSession);
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const summary = {
        totalMessages: 2,
        duration: 300,
        topics: ['greetings'],
        keyPoints: ['Basic conversation'],
      };

      const result = await service.storeSessionTranscript(mockSessionId, summary);

      expect(result.transcriptId).toBe(mockSessionId);
      expect(result.messageCount).toBe(2);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('getPastTranscripts', () => {
    it('should retrieve past transcripts for a user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          sessionType: 'tutor',
          startedAt: new Date(),
          lastActivityAt: new Date(),
          conversationHistory: [{ role: 'user', content: 'Test' }],
          learningContext: {},
        },
        {
          id: 'session-2',
          userId: mockUserId,
          sessionType: 'voice',
          startedAt: new Date(),
          lastActivityAt: new Date(),
          conversationHistory: [{ role: 'user', content: 'Test 2' }],
          learningContext: {},
        },
      ];

      (db.query.aiSessionContexts.findMany as any).mockResolvedValue(mockSessions);

      const result = await service.getPastTranscripts(mockUserId);

      expect(result.length).toBe(2);
      expect(result[0].sessionId).toBe('session-1');
      expect(result[1].sessionId).toBe('session-2');
    });

    it('should filter transcripts by session type', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          sessionType: 'tutor',
          startedAt: new Date(),
          lastActivityAt: new Date(),
          conversationHistory: [],
          learningContext: {},
        },
      ];

      (db.query.aiSessionContexts.findMany as any).mockResolvedValue(mockSessions);

      const result = await service.getPastTranscripts(mockUserId, {
        sessionType: 'tutor',
      });

      expect(result.length).toBe(1);
      expect(result[0].sessionType).toBe('tutor');
    });
  });

  describe('endSession', () => {
    it('should end a session and store transcript', async () => {
      const mockSession = {
        id: mockSessionId,
        userId: mockUserId,
        sessionType: 'voice',
        conversationHistory: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
        ],
        learningContext: {},
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (db.query.aiSessionContexts.findFirst as any).mockResolvedValue(mockSession);
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await service.endSession(mockSessionId);

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.messageCount).toBe(1);
      expect(result.duration).toBeGreaterThan(0);
      expect(db.update).toHaveBeenCalledTimes(2); // Once for transcript, once for ending
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      const mockExpiredSessions = [
        {
          id: 'expired-1',
          userId: mockUserId,
          sessionType: 'tutor',
          conversationHistory: [{ role: 'user', content: 'Test' }],
          learningContext: {},
          startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          lastActivityAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ];

      (db.query.aiSessionContexts.findMany as any).mockResolvedValue(mockExpiredSessions);
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'expired-1' }]),
      });

      const result = await service.cleanupExpiredSessions();

      expect(result.deletedCount).toBe(1);
      expect(result.archivedCount).toBe(1);
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions for a user', async () => {
      const mockActiveSessions = [
        {
          id: 'active-1',
          userId: mockUserId,
          sessionType: 'tutor',
          conversationHistory: [{ role: 'user', content: 'Test' }],
          learningContext: {},
          startedAt: new Date(),
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ];

      (db.query.aiSessionContexts.findMany as any).mockResolvedValue(mockActiveSessions);

      const result = await service.getActiveSessions(mockUserId);

      expect(result.length).toBe(1);
      expect(result[0].sessionId).toBe('active-1');
      expect(result[0].messageCount).toBe(1);
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics for a user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUserId,
          sessionType: 'tutor',
          conversationHistory: [
            { role: 'user', content: 'Test 1' },
            { role: 'assistant', content: 'Response 1' },
          ],
          startedAt: new Date(Date.now() - 600000),
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          id: 'session-2',
          userId: mockUserId,
          sessionType: 'voice',
          conversationHistory: [{ role: 'user', content: 'Test 2' }],
          startedAt: new Date(Date.now() - 300000),
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ];

      (db.query.aiSessionContexts.findMany as any).mockResolvedValue(mockSessions);

      const result = await service.getSessionStatistics(mockUserId);

      expect(result.totalSessions).toBe(2);
      expect(result.activeSessions).toBe(2);
      expect(result.totalMessages).toBe(3);
      expect(result.sessionsByType).toHaveProperty('tutor', 1);
      expect(result.sessionsByType).toHaveProperty('voice', 1);
    });
  });
});
