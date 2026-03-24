import { Router } from 'express';
import { progressService } from '../services/ProgressService';
import { requireAuth, getUserId } from '../middleware/auth';
import { db } from '../db';
import { learningProfiles } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Progress and Analytics Routes
 * Requirements: 15.1-15.6
 */

/**
 * GET /api/progress/:profileId
 * Get comprehensive progress dashboard for a profile
 * Requirements: 15.1, 15.2
 */
router.get('/progress/:profileId', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await db.query.learningProfiles.findFirst({
      where: eq(learningProfiles.id, profileId)
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (profile.userId !== userId) {
      return res.status(403).json({ message: 'Access denied to this profile' });
    }

    const progressData = await progressService.getProgressDashboard(profileId);
    res.json(progressData);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve progress data',
      error: error.message 
    });
  }
});

/**
 * GET /api/progress/:profileId/weaknesses
 * Get identified weakness areas and improvement trends
 * Requirements: 15.4
 */
router.get('/progress/:profileId/weaknesses', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await db.query.learningProfiles.findFirst({
      where: eq(learningProfiles.id, profileId)
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (profile.userId !== userId) {
      return res.status(403).json({ message: 'Access denied to this profile' });
    }

    const weaknessData = await progressService.getWeaknesses(profileId);
    res.json(weaknessData);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve weakness data',
      error: error.message 
    });
  }
});

/**
 * GET /api/progress/:profileId/pronunciation
 * Get pronunciation trends over time with pagination
 * Requirements: 15.5, 23.6
 */
router.get('/progress/:profileId/pronunciation', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { profileId } = req.params;
    const { limit } = req.query;

    // Verify profile belongs to user
    const profile = await db.query.learningProfiles.findFirst({
      where: eq(learningProfiles.id, profileId)
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (profile.userId !== userId) {
      return res.status(403).json({ message: 'Access denied to this profile' });
    }

    const pronunciationData = await progressService.getPronunciationTrends(
      profileId,
      limit ? parseInt(limit as string) : 30
    );
    res.json(pronunciationData);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve pronunciation trends',
      error: error.message 
    });
  }
});

/**
 * GET /api/progress/:profileId/analytics
 * Get comprehensive analytics with optional time range filtering
 * Requirements: 15.3, 15.6
 */
router.get('/progress/:profileId/analytics', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { profileId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify profile belongs to user
    const profile = await db.query.learningProfiles.findFirst({
      where: eq(learningProfiles.id, profileId)
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (profile.userId !== userId) {
      return res.status(403).json({ message: 'Access denied to this profile' });
    }

    const analyticsData = await progressService.getAnalytics({
      profileId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(analyticsData);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve analytics',
      error: error.message 
    });
  }
});

export default router;
