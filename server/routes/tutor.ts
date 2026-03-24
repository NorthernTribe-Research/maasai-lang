import { Router, Request, Response } from 'express';
import { aiTeacherService } from '../services/AITeacherService';
import { learningProfileService } from '../services/LearningProfileService';
import { requireAuth, getUserId } from '../middleware/auth';
import { aiServiceLogger } from '../middleware/logging';

const router = Router();

// Apply AI service logging to all tutor routes
router.use(aiServiceLogger('AITeacher'));

/**
 * Ask the AI tutor a question
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
router.post('/tutor/ask', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, question, context } = req.body;

    if (!profileId || !question) {
      return res.status(400).json({ 
        message: 'Profile ID and question are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Get or create AI tutor session
    const sessionId = await aiTeacherService.getOrCreateSession({
      userId,
      sessionType: 'tutor',
      learningContext: {
        profileId,
        targetLanguage: profile.targetLanguage,
        proficiencyLevel: profile.proficiencyLevel
      }
    });

    // Answer question about vocabulary, grammar, pronunciation, and culture
    // Provide examples and analogies
    // Maintain conversation context within session
    // Adapt explanation complexity to proficiency level
    const answer = await aiTeacherService.answerQuestion({
      question,
      sessionId,
      context: context || {},
      proficiencyLevel: profile.proficiencyLevel
    });

    res.json({
      answer: answer.answer,
      explanation: answer.explanation,
      examples: answer.examples,
      culturalNotes: answer.culturalNotes,
      etiquetteRules: answer.etiquetteRules,
      commonMistakes: answer.commonMistakes,
      relatedConcepts: answer.relatedConcepts,
      practiceExercises: answer.practiceExercises,
      sessionId,
      message: 'Question answered successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to answer question',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get conversation history for a tutor session
 * Requirements: 9.7
 */
router.get('/tutor/history/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { sessionId } = req.params;

    // Get conversation history
    const history = await aiTeacherService.getConversationHistory(sessionId);

    res.json({
      history,
      message: 'Conversation history retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get conversation history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear conversation context for a session
 */
router.delete('/tutor/session/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { sessionId } = req.params;

    // Clear context for session cleanup
    await aiTeacherService.clearContext(sessionId);

    res.json({
      message: 'Session context cleared successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to clear session context',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get active tutor sessions for a user
 */
router.get('/tutor/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId } = req.query;

    if (!profileId || typeof profileId !== 'string') {
      return res.status(400).json({ 
        message: 'Profile ID is required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Get or create session to return active session info
    const sessionId = await aiTeacherService.getOrCreateSession({
      userId,
      sessionType: 'tutor',
      learningContext: {
        profileId,
        targetLanguage: profile.targetLanguage,
        proficiencyLevel: profile.proficiencyLevel
      }
    });

    res.json({
      sessionId,
      message: 'Active session retrieved'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get active sessions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
