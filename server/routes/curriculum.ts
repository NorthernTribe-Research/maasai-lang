import { Router, Request, Response } from 'express';
import { curriculumService } from '../services/CurriculumService';
import { learningProfileService } from '../services/LearningProfileService';
import { adaptiveLearningService } from '../services/AdaptiveLearningService';
import { UserStatsService } from '../services/UserStatsService';
import { requireAuth, getUserId } from '../middleware/auth';
import { aiServiceLogger } from '../middleware/logging';

const router = Router();

// Apply AI service logging to all curriculum routes
router.use(aiServiceLogger('Curriculum'));

/**
 * Generate curriculum for a learning profile
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
router.post('/curriculum/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, targetLanguage, nativeLanguage } = req.body;

    if (!profileId || !targetLanguage || !nativeLanguage) {
      return res.status(400).json({ 
        message: 'Profile ID, target language, and native language are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Generate curriculum (at least 10 lessons per proficiency level)
    const curriculum = await curriculumService.generateLearningPath({
      profileId,
      targetLanguage,
      nativeLanguage
    });

    res.status(201).json({
      curriculum,
      message: 'Curriculum generated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to generate curriculum',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get next lesson for a profile using adaptive learning
 * Requirements: 5.1, 5.2
 */
router.get('/lessons/next', requireAuth, async (req: Request, res: Response) => {
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

    // Get next lesson using adaptive learning service
    const nextLesson = await curriculumService.getNextLesson(profileId);

    if (!nextLesson) {
      return res.status(404).json({ 
        message: 'No more lessons available. Curriculum may need to be generated.' 
      });
    }

    res.json({
      lesson: nextLesson,
      message: 'Next lesson retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get next lesson',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get a specific lesson by ID
 * Requirements: 5.1, 5.2
 */
router.get('/lessons/:lessonId([0-9a-fA-F-]{36})', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { lessonId } = req.params;
    const requestedProfileId = typeof req.query.profileId === 'string' ? req.query.profileId : undefined;

    let profileId = requestedProfileId;
    if (!profileId) {
      const profiles = await learningProfileService.getUserProfiles(userId);
      profileId = profiles[0]?.id;
    }

    if (profileId) {
      const profile = await learningProfileService.getProfileById(profileId);
      if (!profile || profile.userId !== userId) {
        return res.status(404).json({
          message: 'Profile not found or access denied'
        });
      }

      const timeline = await curriculumService.getLessonTimeline(profileId);
      const timelineLesson = timeline.lessons.find((item) => item.id === lessonId);
      if (timelineLesson) {
        if (timelineLesson.accessMode === 'blocked') {
          const lessonGate = await UserStatsService.getDailyLessonGate(userId);
          return res.status(402).json({
            message: 'Daily free lessons are finished. Use hearts or wait for tomorrow.',
            code: 'DAILY_LESSON_LIMIT_REACHED',
            heartsRequired: timelineLesson.heartsRequired || lessonGate.heartsPerExtraLesson,
            hearts: lessonGate.hearts,
            freeLessonsPerDay: lessonGate.freeLessonsPerDay,
            lessonsCompletedToday: lessonGate.completedLessonsToday,
            remainingFreeLessons: lessonGate.remainingFreeLessons,
            nextFreeLessonAt: timelineLesson.availableTomorrowAt || lessonGate.nextFreeLessonAt
          });
        }

        if (timelineLesson.state === 'locked') {
          return res.status(403).json({
            message: 'This lesson is still locked. Complete prerequisites or wait for unlock schedule.',
            code: 'LESSON_LOCKED',
            unlockAt: timelineLesson.unlockAt
          });
        }
      }
    }

    const lesson = await curriculumService.getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({ 
        message: 'Lesson not found' 
      });
    }

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get lesson',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Mark lesson as complete with performance metrics
 * Requirements: 5.6, 5.7, 10.1
 */
router.post('/lessons/:lessonId([0-9a-fA-F-]{36})/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { lessonId } = req.params;
    const { profileId, accuracy, completionTime, errorsCount, errorPatterns } = req.body;

    if (!profileId) {
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

    // Mark lesson complete and award XP
    const result = await curriculumService.markLessonComplete({
      lessonId,
      profileId,
      metrics: {
        accuracy: accuracy || 0,
        completionTime: completionTime || 0,
        errorsCount: errorsCount || 0,
        errorPatterns: errorPatterns || []
      }
    });

    // Update learning profile based on performance
    await adaptiveLearningService.analyzePerformance({
      profileId,
      activityType: 'lesson',
      metrics: {
        accuracy: accuracy || 0,
        completionTime: completionTime || 0,
        errorsCount: errorsCount || 0,
        errorPatterns: errorPatterns || []
      }
    });

    // Update streak
    await learningProfileService.updateStreak(profileId);

    res.json({
      xpAwarded: result.xpAwarded,
      profileUpdates: result.profileUpdates,
      message: 'Lesson completed successfully'
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode;
    if (statusCode === 402 || statusCode === 403) {
      return res.status(statusCode).json({
        message: error instanceof Error ? error.message : 'Lesson access restricted',
        code: (error as any)?.code || 'LESSON_ACCESS_RESTRICTED',
        details: (error as any)?.details || null
      });
    }

    res.status(500).json({ 
      message: 'Failed to complete lesson',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get lesson completion history
 * Requirements: 5.6
 */
router.get('/lessons/history', requireAuth, async (req: Request, res: Response) => {
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

    const history = await curriculumService.getLessonHistory(
      profileId,
      limit ? parseInt(limit as string) : 10
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get lesson history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
