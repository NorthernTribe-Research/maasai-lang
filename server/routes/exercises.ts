import { Router, Request, Response } from 'express';
import { exerciseService } from '../services/ExerciseService';
import { learningProfileService } from '../services/LearningProfileService';
import { adaptiveLearningService } from '../services/AdaptiveLearningService';
import { requireAuth, getUserId } from '../middleware/auth';
import { aiServiceLogger } from '../middleware/logging';

const router = Router();

// Apply AI service logging to all exercise routes
router.use(aiServiceLogger('Exercise'));

/**
 * Generate exercises for practice
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
router.post('/exercises/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, targetLanguage, weaknessAreas, count } = req.body;

    if (!profileId || !targetLanguage) {
      return res.status(400).json({ 
        message: 'Profile ID and target language are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Generate at least 5 exercises per session
    // Target identified weakness areas
    // Adjust difficulty based on proficiency level
    const exercises = await exerciseService.generateExercises({
      profileId,
      targetLanguage,
      weaknessAreas: weaknessAreas || profile.weaknesses as string[],
      count: count || 5
    });

    res.status(201).json({
      exercises,
      message: `Generated ${exercises.length} exercises`
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to generate exercises',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Submit exercise answer for evaluation
 * Requirements: 6.5, 10.2
 */
router.post('/exercises/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { exerciseId, profileId, userAnswer, timeTaken } = req.body;

    if (!exerciseId || !profileId || userAnswer === undefined) {
      return res.status(400).json({ 
        message: 'Exercise ID, profile ID, and user answer are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Submit and evaluate answer
    // Provide immediate feedback on correctness
    // Award XP proportional to accuracy
    const result = await exerciseService.submitExercise({
      exerciseId,
      profileId,
      userAnswer,
      timeTaken: timeTaken || 0
    });

    // Track performance for adaptive engine
    await adaptiveLearningService.analyzePerformance({
      profileId,
      activityType: 'exercise',
      metrics: {
        accuracy: result.isCorrect ? 100 : 0,
        completionTime: timeTaken || 0,
        errorsCount: result.isCorrect ? 0 : 1,
        errorPatterns: result.isCorrect ? [] : [result.correctAnswer]
      }
    });

    // Update streak
    await learningProfileService.updateStreak(profileId);

    res.json({
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
      feedback: result.feedback,
      xpAwarded: result.xpAwarded,
      message: result.isCorrect ? 'Correct answer!' : 'Incorrect answer'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to submit exercise',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get exercise history for a profile
 */
router.get('/exercises/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, limit } = req.query;

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

    const history = await exerciseService.getExerciseHistory(
      profileId,
      limit ? parseInt(limit as string) : 20
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get exercise history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get exercise statistics for a profile
 * Requirements: 15.2
 */
router.get('/exercises/stats', requireAuth, async (req: Request, res: Response) => {
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

    const stats = await exerciseService.getExerciseStats(profileId);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get exercise statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
