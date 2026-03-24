import { Router, Request, Response } from 'express';
import { sessionContextService } from '../services/SessionContextService';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Helper function to validate request body with Zod schema
const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      next(error);
    }
  };
};

// Validation schemas
const createSessionSchema = z.object({
  sessionType: z.enum(['tutor', 'voice', 'general']),
  learningContext: z.object({
    profileId: z.string().optional(),
    currentLesson: z.string().optional(),
    recentTopics: z.array(z.string()).optional(),
    weaknesses: z.array(z.any()).optional(),
    proficiencyLevel: z.string().optional(),
    targetLanguage: z.string().optional(),
    nativeLanguage: z.string().optional()
  }),
  expirationHours: z.number().positive().optional()
});

const addMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  metadata: z.any().optional()
});

const storeTranscriptSchema = z.object({
  summary: z.object({
    totalMessages: z.number(),
    duration: z.number(),
    topics: z.array(z.string()),
    keyPoints: z.array(z.string())
  }).optional()
});

const endSessionSchema = z.object({
  summary: z.object({
    totalMessages: z.number(),
    duration: z.number(),
    topics: z.array(z.string()),
    keyPoints: z.array(z.string()),
    performance: z.any().optional()
  }).optional()
});

/**
 * Create a new session context
 * POST /api/sessions
 * Requirements: 22.1
 */
router.post(
  '/',
  requireAuth,
  validateBody(createSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await sessionContextService.createSessionContext({
        userId,
        ...req.body
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error creating session context:', error);
      res.status(500).json({
        error: 'Failed to create session context',
        message: error.message
      });
    }
  }
);

/**
 * Get or create an active session context
 * POST /api/sessions/get-or-create
 * Requirements: 22.1
 */
router.post(
  '/get-or-create',
  requireAuth,
  validateBody(z.object({
    sessionType: z.enum(['tutor', 'voice', 'general']),
    learningContext: z.any()
  })),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const sessionId = await sessionContextService.getOrCreateSessionContext({
        userId,
        ...req.body
      });

      res.json({
        success: true,
        data: { sessionId }
      });
    } catch (error: any) {
      console.error('Error getting or creating session:', error);
      res.status(500).json({
        error: 'Failed to get or create session',
        message: error.message
      });
    }
  }
);

/**
 * Add a message to conversation history
 * POST /api/sessions/:sessionId/messages
 * Requirements: 22.2
 */
router.post(
  '/:sessionId/messages',
  requireAuth,
  validateBody(addMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await sessionContextService.addMessageToHistory(sessionId, req.body);

      res.json({
        success: true,
        message: 'Message added to conversation history'
      });
    } catch (error: any) {
      console.error('Error adding message to history:', error);
      res.status(500).json({
        error: 'Failed to add message',
        message: error.message
      });
    }
  }
);

/**
 * Get conversation history for a session
 * GET /api/sessions/:sessionId/history
 * Requirements: 22.2, 22.5
 */
router.get(
  '/:sessionId/history',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      const history = await sessionContextService.getConversationHistory(sessionId, limit);

      res.json({
        success: true,
        data: {
          sessionId,
          history,
          messageCount: history.length
        }
      });
    } catch (error: any) {
      console.error('Error retrieving conversation history:', error);
      res.status(500).json({
        error: 'Failed to retrieve conversation history',
        message: error.message
      });
    }
  }
);

/**
 * Store session transcript
 * POST /api/sessions/:sessionId/transcript
 * Requirements: 22.3, 22.4
 */
router.post(
  '/:sessionId/transcript',
  requireAuth,
  validateBody(storeTranscriptSchema),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const result = await sessionContextService.storeSessionTranscript(
        sessionId,
        req.body.summary
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error storing transcript:', error);
      res.status(500).json({
        error: 'Failed to store transcript',
        message: error.message
      });
    }
  }
);

/**
 * Get past session transcripts
 * GET /api/sessions/transcripts
 * Requirements: 22.5
 */
router.get(
  '/transcripts',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const options = {
        sessionType: req.query.sessionType as 'tutor' | 'voice' | 'general' | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const transcripts = await sessionContextService.getPastTranscripts(userId, options);

      res.json({
        success: true,
        data: {
          transcripts,
          count: transcripts.length
        }
      });
    } catch (error: any) {
      console.error('Error retrieving transcripts:', error);
      res.status(500).json({
        error: 'Failed to retrieve transcripts',
        message: error.message
      });
    }
  }
);

/**
 * Get a specific session transcript
 * GET /api/sessions/:sessionId/transcript
 * Requirements: 22.5
 */
router.get(
  '/:sessionId/transcript',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const transcript = await sessionContextService.getSessionTranscript(sessionId);

      if (!transcript) {
        return res.status(404).json({
          error: 'Session transcript not found'
        });
      }

      res.json({
        success: true,
        data: transcript
      });
    } catch (error: any) {
      console.error('Error retrieving transcript:', error);
      res.status(500).json({
        error: 'Failed to retrieve transcript',
        message: error.message
      });
    }
  }
);

/**
 * Update session learning context
 * PATCH /api/sessions/:sessionId/context
 * Requirements: 22.2
 */
router.patch(
  '/:sessionId/context',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await sessionContextService.updateLearningContext(sessionId, req.body);

      res.json({
        success: true,
        message: 'Learning context updated'
      });
    } catch (error: any) {
      console.error('Error updating learning context:', error);
      res.status(500).json({
        error: 'Failed to update learning context',
        message: error.message
      });
    }
  }
);

/**
 * Extend session expiration
 * POST /api/sessions/:sessionId/extend
 * Requirements: 22.6
 */
router.post(
  '/:sessionId/extend',
  requireAuth,
  validateBody(z.object({
    additionalHours: z.number().positive()
  })),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { additionalHours } = req.body;

      const newExpiresAt = await sessionContextService.extendSessionExpiration(
        sessionId,
        additionalHours
      );

      res.json({
        success: true,
        data: {
          sessionId,
          expiresAt: newExpiresAt
        }
      });
    } catch (error: any) {
      console.error('Error extending session:', error);
      res.status(500).json({
        error: 'Failed to extend session',
        message: error.message
      });
    }
  }
);

/**
 * Get active sessions for current user
 * GET /api/sessions/active
 * Requirements: 22.6
 */
router.get(
  '/active',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const sessions = await sessionContextService.getActiveSessions(userId);

      res.json({
        success: true,
        data: {
          sessions,
          count: sessions.length
        }
      });
    } catch (error: any) {
      console.error('Error retrieving active sessions:', error);
      res.status(500).json({
        error: 'Failed to retrieve active sessions',
        message: error.message
      });
    }
  }
);

/**
 * End a session
 * POST /api/sessions/:sessionId/end
 * Requirements: 22.3, 22.4
 */
router.post(
  '/:sessionId/end',
  requireAuth,
  validateBody(endSessionSchema),
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const result = await sessionContextService.endSession(sessionId, req.body.summary);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error ending session:', error);
      res.status(500).json({
        error: 'Failed to end session',
        message: error.message
      });
    }
  }
);

/**
 * Get session statistics
 * GET /api/sessions/statistics
 */
router.get(
  '/statistics',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const statistics = await sessionContextService.getSessionStatistics(userId);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('Error retrieving session statistics:', error);
      res.status(500).json({
        error: 'Failed to retrieve session statistics',
        message: error.message
      });
    }
  }
);

/**
 * Clean up expired sessions (admin endpoint)
 * POST /api/sessions/cleanup
 * Requirements: 22.6
 */
router.post(
  '/cleanup',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // Check if user is admin (you may want to add admin middleware)
      const result = await sessionContextService.cleanupExpiredSessions();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error cleaning up sessions:', error);
      res.status(500).json({
        error: 'Failed to clean up sessions',
        message: error.message
      });
    }
  }
);

export default router;
