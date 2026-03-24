import { Router } from 'express';
import { gamificationService } from '../services/GamificationService';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();

/**
 * Gamification Routes
 * Requirements: 10.1-10.5, 11.1-11.5, 12.1-12.5, 13.1-13.5, 14.1-14.6
 */

/**
 * GET /api/gamification/xp
 * Retrieve user's total XP and recent XP gains
 * Requirements: 10.1, 10.4, 10.5
 */
router.get('/gamification/xp', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const xpData = await gamificationService.getUserXP(userId);
    res.json(xpData);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve XP data',
      error: error.message 
    });
  }
});

/**
 * GET /api/gamification/achievements
 * List all available achievements
 * Requirements: 11.1, 11.3
 */
router.get('/gamification/achievements', async (_req, res) => {
  try {
    const achievements = await gamificationService.getAllAchievements();
    res.json(achievements);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve achievements',
      error: error.message 
    });
  }
});

/**
 * GET /api/gamification/user/achievements
 * Get user's earned and locked achievements
 * Requirements: 11.2, 11.4, 11.5
 */
router.get('/gamification/user/achievements', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userAchievements = await gamificationService.getUserAchievements(userId);
    res.json(userAchievements);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve user achievements',
      error: error.message 
    });
  }
});

/**
 * GET /api/gamification/daily-challenge
 * Get current daily challenge for user
 * Requirements: 12.1, 12.2, 12.3
 */
router.get('/gamification/daily-challenge', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const dailyChallenge = await gamificationService.getDailyChallenge(userId);
    
    if (!dailyChallenge) {
      return res.status(404).json({ 
        message: 'No daily challenge available. Please create a learning profile first.' 
      });
    }

    res.json(dailyChallenge);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve daily challenge',
      error: error.message 
    });
  }
});

/**
 * POST /api/gamification/daily-challenge/complete
 * Complete daily challenge and award bonus XP
 * Requirements: 12.4
 */
router.post('/gamification/daily-challenge/complete', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { challengeId } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: 'Challenge ID is required' });
    }

    const result = await gamificationService.completeDailyChallenge(userId, challengeId);
    
    // Check for newly unlocked achievements
    const newAchievements = await gamificationService.checkAchievements(userId);

    res.json({
      ...result,
      newAchievements
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to complete daily challenge',
      error: error.message 
    });
  }
});

/**
 * GET /api/gamification/streak
 * Get user's current streak information
 * Requirements: 13.1, 13.4
 */
router.get('/gamification/streak', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const streakData = await gamificationService.getUserStreak(userId);
    res.json(streakData);
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve streak data',
      error: error.message 
    });
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard with pagination and optional filtering
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 23.6
 */
router.get('/gamification/leaderboard', async (req, res) => {
  try {
    const { language, period, limit, offset } = req.query;

    const result = await gamificationService.getLeaderboard({
      languageFilter: language as string,
      timePeriod: period as 'daily' | 'weekly' | 'all-time',
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0
    });

    // If user is authenticated, include their rank
    const userId = getUserId(req);
    let userRank = null;
    
    if (userId) {
      userRank = await gamificationService.getUserRank(userId);
    }

    res.json({
      rankings: result.rankings,
      total: result.total,
      hasMore: result.hasMore,
      userRank
    });
  } catch (error: any) {
    res.status(500).json({ 
      message: 'Failed to retrieve leaderboard',
      error: error.message 
    });
  }
});

export default router;
