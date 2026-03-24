import { Router, Request, Response } from 'express';
import { voiceTeachingService } from '../services/VoiceTeachingService';
import { learningProfileService } from '../services/LearningProfileService';
import { requireAuth, getUserId } from '../middleware/auth';
import { aiServiceLogger } from '../middleware/logging';
import multer from 'multer';

const router = Router();

// Apply AI service logging to all voice routes
router.use(aiServiceLogger('VoiceTeaching'));

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
 * Start a voice teaching session
 * Requirements: 7.1, 7.2
 */
router.post('/voice/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { profileId, topic } = req.body;

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

    // Start voice session with initial prompt in target language
    const session = await voiceTeachingService.startVoiceSession({
      profileId,
      targetLanguage: profile.targetLanguage,
      proficiencyLevel: profile.proficiencyLevel,
      topic: topic || 'general conversation'
    });

    res.status(201).json({
      sessionId: session.sessionId,
      initialPrompt: session.initialPrompt,
      message: 'Voice session started successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to start voice session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process voice input during a session
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6
 */
router.post('/voice/interact', requireAuth, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { sessionId, profileId } = req.body;
    const audioFile = req.file;

    if (!sessionId || !profileId || !audioFile) {
      return res.status(400).json({ 
        message: 'Session ID, profile ID, and audio file are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // Process voice input:
    // 1. Convert speech to text using WhisperService
    // 2. Generate contextual response using GeminiService
    // 3. Provide corrections and explanations for errors
    const result = await voiceTeachingService.processVoiceInput({
      sessionId,
      audioData: audioFile.buffer,
      targetLanguage: profile.targetLanguage,
      proficiencyLevel: profile.proficiencyLevel
    });

    res.json({
      transcript: result.transcript,
      response: result.response,
      corrections: result.corrections,
      feedback: result.feedback,
      message: 'Voice input processed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to process voice input',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * End a voice teaching session
 * Requirements: 7.7, 10.3
 */
router.post('/voice/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { sessionId, profileId } = req.body;

    if (!sessionId || !profileId) {
      return res.status(400).json({ 
        message: 'Session ID and profile ID are required' 
      });
    }

    // Verify profile belongs to user
    const profile = await learningProfileService.getProfileById(profileId);
    if (!profile || profile.userId !== userId) {
      return res.status(404).json({ 
        message: 'Profile not found or access denied' 
      });
    }

    // End session with transcript storage and XP award
    const result = await voiceTeachingService.endVoiceSession({
      sessionId,
      profileId
    });

    // Update streak
    await learningProfileService.updateStreak(profileId);

    res.json({
      transcript: result.transcript,
      xpAwarded: result.xpAwarded,
      totalTurns: result.totalTurns,
      duration: result.duration,
      message: 'Voice session ended successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to end voice session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get voice session history
 * Requirements: 7.7
 */
router.get('/voice/history', requireAuth, async (req: Request, res: Response) => {
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

    const history = await voiceTeachingService.getSessionHistory(
      profileId,
      limit ? parseInt(limit as string) : 10
    );

    res.json(history);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get voice session history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get a specific voice session transcript
 */
router.get('/voice/session/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { sessionId } = req.params;
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

    const session = await voiceTeachingService.getSessionById(sessionId);

    if (!session || session.profileId !== profileId) {
      return res.status(404).json({ 
        message: 'Session not found or access denied' 
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to get voice session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
