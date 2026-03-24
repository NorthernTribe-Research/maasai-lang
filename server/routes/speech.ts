import { Router, Request, Response } from 'express';
import { speechService } from '../services/SpeechService';
import { learningProfileService } from '../services/LearningProfileService';
import { adaptiveLearningService } from '../services/AdaptiveLearningService';
import { requireAuth, getUserId } from '../middleware/auth';
import { aiServiceLogger } from '../middleware/logging';
import multer from 'multer';

const router = Router();

// Apply AI service logging to all speech routes
router.use(aiServiceLogger('Speech'));

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

/**
 * Analyze pronunciation and provide coaching
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
router.post('/speech/analyze', requireAuth, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, targetText, language } = req.body;
    const audioFile = req.file;

    if (!profileId || !targetText || !language || !audioFile) {
      return res.status(400).json({ 
        message: 'Profile ID, target text, language, and audio file are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Analyze pronunciation:
    // 1. Compare learner speech against native patterns
    // 2. Calculate pronunciation accuracy score (0-100)
    // 3. Identify problematic phonemes
    // 4. Provide audio examples of correct pronunciation
    const analysis = await speechService.analyzePronunciation({
      audioData: audioFile.buffer,
      targetText,
      language,
      proficiencyLevel: profile.proficiencyLevel
    });

    // Generate targeted pronunciation exercises
    const exercises = await speechService.generatePronunciationExercises({
      problematicPhonemes: analysis.problematicPhonemes.map(p => p.phoneme),
      language
    });

    // Save pronunciation analysis
    await speechService.savePronunciationAnalysis({
      profileId,
      score: analysis.score,
      transcript: targetText, // Would be actual transcript from Whisper
      targetText,
      problematicPhonemes: analysis.problematicPhonemes,
      feedback: analysis.feedback
    });

    // Track pronunciation improvement in learning profile
    await adaptiveLearningService.analyzePerformance({
      profileId,
      activityType: 'pronunciation',
      metrics: {
        accuracy: analysis.score,
        completionTime: 0,
        errorsCount: analysis.problematicPhonemes.length,
        errorPatterns: analysis.problematicPhonemes.map(p => p.phoneme)
      }
    });

    // Update streak
    await learningProfileService.updateStreak(profileId);

    res.json({
      score: analysis.score,
      feedback: analysis.feedback,
      problematicPhonemes: analysis.problematicPhonemes,
      audioExamples: analysis.audioExamples,
      exercises,
      message: 'Pronunciation analyzed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to analyze pronunciation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get pronunciation progress over time
 * Requirements: 8.6
 */
router.get('/speech/progress', requireAuth, async (req: Request, res: Response) => {
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

    // Track pronunciation progress over time
    const progress = await speechService.trackPronunciationProgress(profileId);

    res.json(progress);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get pronunciation progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate pronunciation exercises for specific phonemes
 * Requirements: 8.7
 */
router.post('/speech/exercises', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, problematicPhonemes, language } = req.body;

    if (!profileId || !problematicPhonemes || !language) {
      return res.status(400).json({ 
        message: 'Profile ID, problematic phonemes, and language are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Generate targeted pronunciation exercises
    const exercises = await speechService.generatePronunciationExercises({
      problematicPhonemes,
      language
    });

    res.json({
      exercises,
      message: 'Pronunciation exercises generated successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to generate pronunciation exercises',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
