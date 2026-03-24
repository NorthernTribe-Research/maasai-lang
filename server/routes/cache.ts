import { Router } from 'express';
import { cache } from '../utils/cache';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Get cache statistics
 * Requirements: 23.2
 */
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = cache.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

/**
 * Clear all cache entries
 * Requirements: 23.2
 */
router.post('/clear', requireAuth, (req, res) => {
  try {
    cache.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * Delete cache entries matching a pattern
 * Requirements: 23.2
 */
router.post('/invalidate', requireAuth, (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required'
      });
    }
    
    const deleted = cache.deletePattern(pattern);
    res.json({
      success: true,
      message: `Invalidated ${deleted} cache entries`,
      deleted
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    });
  }
});

/**
 * Invalidate cache for a specific profile
 * Requirements: 23.2
 */
router.post('/invalidate/profile/:profileId', requireAuth, (req, res) => {
  try {
    const { profileId } = req.params;
    
    cache.invalidateProfile(profileId);
    res.json({
      success: true,
      message: `Invalidated cache for profile ${profileId}`
    });
  } catch (error) {
    console.error('Error invalidating profile cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate profile cache'
    });
  }
});

/**
 * Invalidate cache for a specific curriculum
 * Requirements: 23.2
 */
router.post('/invalidate/curriculum/:curriculumId', requireAuth, (req, res) => {
  try {
    const { curriculumId } = req.params;
    
    cache.invalidateCurriculum(curriculumId);
    res.json({
      success: true,
      message: `Invalidated cache for curriculum ${curriculumId}`
    });
  } catch (error) {
    console.error('Error invalidating curriculum cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate curriculum cache'
    });
  }
});

export default router;
