import { Router, Request, Response } from 'express';
import { learningProfileService } from '../services/LearningProfileService';
import { languageService } from '../services';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();

/**
 * Get all supported languages
 * Requirements: 2.1
 */
router.get('/languages', async (_req: Request, res: Response) => {
  try {
    const languages = await languageService.getAllLanguages();
    
    // Return the 5 supported languages
    const supportedLanguages = [
      { id: 1, name: 'Spanish', code: 'es', flag: '🇪🇸' },
      { id: 2, name: 'Mandarin Chinese', code: 'zh', flag: '🇨🇳' },
      { id: 3, name: 'English', code: 'en', flag: '🇬🇧' },
      { id: 4, name: 'Hindi', code: 'hi', flag: '🇮🇳' },
      { id: 5, name: 'Arabic', code: 'ar', flag: '🇸🇦' }
    ];

    res.json(supportedLanguages);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch languages',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create a new learning profile
 * Requirements: 2.2, 2.3
 */
router.post('/profiles', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { targetLanguage, nativeLanguage } = req.body;

    if (!targetLanguage || !nativeLanguage) {
      return res.status(400).json({ 
        message: 'Target language and native language are required' 
      });
    }

    // Validate supported languages
    const supportedLanguages = ['Spanish', 'Mandarin Chinese', 'English', 'Hindi', 'Arabic'];
    if (!supportedLanguages.includes(targetLanguage)) {
      return res.status(400).json({ 
        message: `Unsupported target language. Supported languages: ${supportedLanguages.join(', ')}` 
      });
    }

    const profile = await learningProfileService.createProfile({
      userId,
      targetLanguage,
      nativeLanguage
    });

    res.status(201).json({
      profile,
      message: 'Learning profile created successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create learning profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all learning profiles for the authenticated user
 * Requirements: 2.5
 */
router.get('/profiles', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const profiles = await learningProfileService.getUserProfiles(userId);

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch learning profiles',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get a specific learning profile by language
 * Requirements: 2.4
 */
router.get('/profiles/:targetLanguage', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { targetLanguage } = req.params;

    const profile = await learningProfileService.getProfileByUserAndLanguage(
      userId,
      targetLanguage
    );

    if (!profile) {
      return res.status(404).json({ 
        message: `No learning profile found for ${targetLanguage}` 
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch learning profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get profile statistics
 * Requirements: 15.1, 15.2
 */
router.get('/profiles/:profileId/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    const stats = await learningProfileService.getProfileStats(profileId);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to fetch profile statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update profile streak
 * Requirements: 13.1, 13.2, 13.3
 */
router.post('/profiles/:profileId/streak', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    const updatedProfile = await learningProfileService.updateStreak(profileId);

    res.json({
      profile: updatedProfile,
      message: 'Streak updated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to update streak',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete a learning profile
 */
router.delete('/profiles/:profileId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId } = req.params;

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    await learningProfileService.deleteProfile(profileId);

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to delete profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
