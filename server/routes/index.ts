import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { 
  userService, 
  languageService, 
  lessonService, 
  achievementService,
  challengeService, 
  openAIService,
  geminiService,
  aiTeacherService
} from "../services";
import { aiLearningOrchestrator } from "../services/AILearningOrchestrator";
import { intelligentSessionManager } from "../services/IntelligentSessionManager";
import { aiContentGenerator } from "../services/AIContentGenerator";
import { aiPerformanceAnalyzer } from "../services/AIPerformanceAnalyzer";
import { authService } from "../auth";
import { storage } from "../storage";
import { User } from "@shared/schema";
import { authLimiter, aiLimiter } from "../middleware/security";
import { validateSchema, loginSchema, registerSchema, aiRequestSchema } from "../middleware/validation";
import { asyncHandler } from "../middleware/errorHandler";
import { cache } from "../utils/cache";
import { logger } from "../utils/logger";

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
    }
  }
}

/**
 * Main router class that registers all application routes
 */
export class Router {
  /**
   * Register all application routes
   * @param app Express application
   * @returns HTTP server instance
   */
  async registerRoutes(app: Express): Promise<Server> {
    // Register specific route handlers
    new LanguageRoutes().register(app);
    new LessonRoutes().register(app);
    new AchievementRoutes().register(app);
    new ChallengeRoutes().register(app);
    new AIRoutes().register(app);
    new GeminiAIRoutes().register(app);
    new AIControlledLearningRoutes().register(app);
    
    // Create and return HTTP server
    const server = createServer(app);
    return server;
  }
}

/**
 * Base route class with common functionality
 */
class BaseRoutes {
  /**
   * Check if user is authenticated
   * @param req Express request
   * @param res Express response 
   * @returns Boolean indicating if the middleware should continue
   */
  protected checkAuth(req: Express.Request, res: Express.Response): boolean {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: "Not authenticated" });
      return false;
    }
    return true;
  }
  
  /**
   * Handle route errors
   * @param error Error object
   * @param res Express response
   */
  protected handleError(error: any, res: Express.Response): void {
    console.error("Route error:", error);
    res.status(500).json({ 
      message: "An error occurred", 
      error: error.message 
    });
  }
}

/**
 * Language-related routes
 */
class LanguageRoutes extends BaseRoutes {
  register(app: Express): void {
    // Get all available languages
    app.get("/api/languages", async (_req, res) => {
      try {
        const languages = await languageService.getAllLanguages();
        res.json(languages);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get user's languages
    app.get("/api/user/languages", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const userLanguages = await languageService.getUserLanguages(req.user.id);
        res.json(userLanguages);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Add a language to learn
    app.post("/api/user/languages", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const userLanguage = await languageService.addUserLanguage({
          userId: req.user.id,
          languageId: req.body.languageId,
          level: req.body.level || 1,
          progress: 0,
          isActive: true
        });
        res.status(201).json(userLanguage);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Update language progress
    app.patch("/api/user/languages/:languageId", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId } = req.params;
        const { progress } = req.body;
        
        const userLanguage = await languageService.updateUserLanguageProgress(
          req.user.id,
          parseInt(languageId),
          progress
        );
        
        res.json(userLanguage);
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

/**
 * Lesson-related routes
 */
class LessonRoutes extends BaseRoutes {
  register(app: Express): void {
    // Get lessons for a language
    app.get("/api/languages/:languageId/lessons", async (req, res) => {
      try {
        const { languageId } = req.params;
        const lessons = await lessonService.getLessonsByLanguage(parseInt(languageId));
        res.json(lessons);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get user lessons for a language
    app.get("/api/user/languages/:languageId/lessons", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId } = req.params;
        const userLessons = await lessonService.getUserLessonsForLanguage(
          req.user.id,
          parseInt(languageId)
        );
        res.json(userLessons);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Start a lesson
    app.post("/api/user/lessons", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const userLesson = await lessonService.startUserLesson({
          userId: req.user.id,
          lessonId: req.body.lessonId,
          progress: 0,
          isCompleted: false
        });
        res.status(201).json(userLesson);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Complete a lesson
    app.patch("/api/user/lessons/:lessonId", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { lessonId } = req.params;
        const { progress } = req.body;
        
        const userLesson = await lessonService.completeUserLesson(
          req.user.id,
          parseInt(lessonId),
          progress
        );
        
        res.json(userLesson);
      } catch (error) {
        this.handleError(error, res);
      }
    });
    
    // Create a new lesson (admin only)
    app.post("/api/admin/lessons", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      
      // Check if user is admin
      if (!req.user.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: Admin privileges required" });
      }

      try {
        const lessonData = req.body;
        
        // Validate required fields
        if (!lessonData.title || !lessonData.type || !lessonData.languageId) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Set default values if not provided
        if (lessonData.level === undefined) lessonData.level = 1;
        if (lessonData.xpReward === undefined) lessonData.xpReward = lessonData.level * 10;
        if (lessonData.duration === undefined) lessonData.duration = 10;
        if (lessonData.order === undefined) {
          // Find the highest order for this language and increment
          const lessons = await lessonService.getLessonsByLanguage(lessonData.languageId);
          const maxOrder = lessons.reduce((max, lesson) => 
            lesson.order > max ? lesson.order : max, 0);
          lessonData.order = maxOrder + 1;
        }
        
        const lesson = await lessonService.addLesson(lessonData);
        res.status(201).json(lesson);
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

/**
 * Achievement-related routes
 */
class AchievementRoutes extends BaseRoutes {
  register(app: Express): void {
    // Get all achievements
    app.get("/api/achievements", async (_req, res) => {
      try {
        const achievements = await achievementService.getAllAchievements();
        res.json(achievements);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get user achievements
    app.get("/api/user/achievements", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const userAchievements = await achievementService.getUserAchievements(req.user.id);
        res.json(userAchievements);
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

/**
 * Challenge-related routes
 */
class ChallengeRoutes extends BaseRoutes {
  register(app: Express): void {
    // Get daily challenge
    app.get("/api/user/daily-challenge", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const dailyChallenge = await challengeService.getDailyChallenge(req.user.id);
        res.json(dailyChallenge);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Complete daily challenge
    app.post("/api/user/daily-challenge/:challengeId/complete", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { challengeId } = req.params;
        const { isCorrect } = req.body;
        
        const result = await challengeService.completeDailyChallenge(
          req.user.id,
          parseInt(challengeId),
          isCorrect
        );
        
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get leaderboard
    app.get("/api/leaderboard", async (_req, res) => {
      try {
        const leaderboard = await challengeService.getLeaderboard();
        res.json(leaderboard);
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

/**
 * AI-related routes
 */
class AIRoutes extends BaseRoutes {
  register(app: Express): void {
    // Generate an exercise with rate limiting
    app.post("/api/ai/exercise", 
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { language, level, type } = req.body;
        const cacheKey = `exercise:${language}:${level}:${type}`;
        
        // Check cache first
        let exercise = cache.get(cacheKey);
        if (!exercise) {
          exercise = await openAIService.generateExercise(language, level, type);
          cache.set(cacheKey, exercise, 30 * 60 * 1000); // Cache for 30 minutes
        }
        
        res.json(exercise);
      })
    );

    // Generate a language tip
    app.get("/api/ai/tip/:language", async (req, res) => {
      try {
        const { language } = req.params;
        const tip = await openAIService.generateLanguageTip(language);
        res.json({ tip });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Check a translation
    app.post("/api/ai/translation/check", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { original, translation, language } = req.body;
        const result = await openAIService.checkTranslation(original, translation, language);
        res.json(result);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate a study plan
    app.post("/api/ai/studyplan", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { language, level, goal, timeAvailable } = req.body;
        const studyPlan = await openAIService.generateStudyPlan(language, level, goal, timeAvailable);
        res.json(studyPlan);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate comprehensive lesson with AI
    app.post("/api/ai/comprehensive-lesson", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, userId, topic, level } = req.body;
        const { aiEnhancedServices } = await import('../services/AIEnhancedServices');
        const lesson = await aiEnhancedServices.generateComprehensiveLesson(
          parseInt(languageId),
          parseInt(userId || req.user?.id),
          topic,
          level
        );
        res.json(lesson);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate personalized exercises
    app.post("/api/ai/personalized-exercises", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, exerciseType, count } = req.body;
        const userId = req.user?.id;
        const { aiEnhancedServices } = await import('../services/AIEnhancedServices');
        
        const exercises = await aiEnhancedServices.generatePersonalizedExercises(
          userId,
          parseInt(languageId),
          exerciseType,
          parseInt(count) || 5
        );
        res.json(exercises);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Analyze session and adapt
    app.post("/api/ai/analyze-session", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, sessionData } = req.body;
        const userId = req.user?.id;
        const { aiEnhancedServices } = await import('../services/AIEnhancedServices');
        
        const analysis = await aiEnhancedServices.analyzeSessionAndAdapt(
          userId,
          parseInt(languageId),
          sessionData
        );
        res.json(analysis);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate learning path
    app.post("/api/ai/learning-path", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, goals, timeframe } = req.body;
        const userId = req.user?.id;
        const { aiEnhancedServices } = await import('../services/AIEnhancedServices');
        
        const learningPath = await aiEnhancedServices.generatePersonalizedLearningPath(
          userId,
          parseInt(languageId),
          goals,
          parseInt(timeframe)
        );
        res.json(learningPath);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Pronunciation coaching
    app.post("/api/ai/pronunciation-coaching", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageCode, audioData, expectedText } = req.body;
        const userId = req.user?.id;
        const { aiEnhancedServices } = await import('../services/AIEnhancedServices');
        
        const coaching = await aiEnhancedServices.providePronunciationCoaching(
          userId,
          languageCode,
          audioData,
          expectedText
        );
        res.json(coaching);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate vocabulary list
    app.post("/api/ai/vocabulary", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { language, theme, level, count } = req.body;
        const vocabulary = await geminiService.generateVocabularyList(
          language,
          theme,
          level,
          parseInt(count) || 20
        );
        res.json(vocabulary);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate grammar explanation
    app.post("/api/ai/grammar", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { language, topic, level } = req.body;
        const grammar = await geminiService.generateGrammarExplanation(
          language,
          topic,
          level
        );
        res.json(grammar);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate cultural content
    app.post("/api/ai/cultural-content", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { language, topic, level } = req.body;
        const content = await geminiService.generateCulturalContent(
          language,
          topic,
          level
        );
        res.json(content);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Voice Teaching Routes
    
    // Generate voice lesson
    app.post("/api/ai/voice/lesson", 
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { language, topic, level, duration, learnerProfile } = req.body;
        const { VoiceTeachingService } = await import('../services/VoiceTeachingService');
        const { geminiService } = await import('../services/GeminiService');
        
        const voiceService = new VoiceTeachingService(geminiService);
        const lesson = await voiceService.generateVoiceLesson(
          language,
          topic,
          level,
          duration || 30,
          learnerProfile || { weakAreas: [], preferences: {}, previousLessons: [] }
        );
        
        res.json(lesson);
      })
    );

    // Start voice conversation
    app.post("/api/ai/voice/conversation/start",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { languageId, topic, level } = req.body;
        const userId = req.user?.id;
        const { VoiceTeachingService } = await import('../services/VoiceTeachingService');
        const { geminiService } = await import('../services/GeminiService');
        
        const voiceService = new VoiceTeachingService(geminiService);
        const session = await voiceService.startVoiceConversation(
          userId,
          parseInt(languageId),
          topic,
          level
        );
        
        res.json(session);
      })
    );

    // Process voice input
    app.post("/api/ai/voice/conversation/input",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { sessionId, audioTranscript, confidence, audioData } = req.body;
        const { VoiceTeachingService } = await import('../services/VoiceTeachingService');
        const { geminiService } = await import('../services/GeminiService');
        
        const voiceService = new VoiceTeachingService(geminiService);
        const response = await voiceService.processVoiceInput(
          sessionId,
          audioTranscript,
          confidence || 100,
          audioData
        );
        
        res.json(response);
      })
    );

    // End voice session
    app.post("/api/ai/voice/conversation/end",
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { sessionId } = req.body;
        const { VoiceTeachingService } = await import('../services/VoiceTeachingService');
        const { geminiService } = await import('../services/GeminiService');
        
        const voiceService = new VoiceTeachingService(geminiService);
        const summary = await voiceService.endVoiceSession(sessionId);
        
        res.json(summary);
      })
    );

    // Generate pronunciation coaching
    app.post("/api/ai/voice/pronunciation",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { language, targetPhrase, userAttempt, difficulty } = req.body;
        const { VoiceTeachingService } = await import('../services/VoiceTeachingService');
        const { geminiService } = await import('../services/GeminiService');
        
        const voiceService = new VoiceTeachingService(geminiService);
        const coaching = await voiceService.generatePronunciationCoaching(
          language,
          targetPhrase,
          userAttempt || '',
          difficulty || 'intermediate'
        );
        
        res.json(coaching);
      })
    );

    // Generate listening exercise
    app.post("/api/ai/voice/listening",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { language, level, topic, duration } = req.body;
        const { VoiceTeachingService } = await import('../services/VoiceTeachingService');
        const { geminiService } = await import('../services/GeminiService');
        
        const voiceService = new VoiceTeachingService(geminiService);
        const exercise = await voiceService.generateListeningExercise(
          language,
          level,
          topic,
          duration || 15
        );
        
        res.json(exercise);
      })
    );

    // Whisper Speech-to-Text Routes
    
    // Transcribe audio using Whisper
    app.post("/api/ai/whisper/transcribe",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { audioData, language, prompt } = req.body;
        
        if (!audioData) {
          return res.status(400).json({ error: "Audio data is required" });
        }

        const { WhisperService } = await import('../services/WhisperService');
        const whisperService = new WhisperService();
        
        if (!whisperService.isServiceAvailable()) {
          return res.status(503).json({ error: "Whisper service not available" });
        }

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        
        const transcription = await whisperService.transcribeAudio(audioBuffer, {
          language,
          prompt,
          responseFormat: 'verbose_json'
        });
        
        res.json(transcription);
      })
    );

    // Analyze pronunciation with Whisper
    app.post("/api/ai/whisper/pronunciation",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { audioData, expectedText, targetLanguage } = req.body;
        
        if (!audioData || !expectedText) {
          return res.status(400).json({ error: "Audio data and expected text are required" });
        }

        const { WhisperService } = await import('../services/WhisperService');
        const whisperService = new WhisperService();
        
        if (!whisperService.isServiceAvailable()) {
          return res.status(503).json({ error: "Whisper service not available" });
        }

        const audioBuffer = Buffer.from(audioData, 'base64');
        
        const analysis = await whisperService.analyzePronunciation(
          audioBuffer,
          expectedText,
          targetLanguage || 'en'
        );
        
        res.json(analysis);
      })
    );

    // Get pronunciation coaching
    app.post("/api/ai/whisper/coaching",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { audioData, targetPhrase, targetLanguage, userLevel } = req.body;
        
        if (!audioData || !targetPhrase) {
          return res.status(400).json({ error: "Audio data and target phrase are required" });
        }

        const { WhisperService } = await import('../services/WhisperService');
        const whisperService = new WhisperService();
        
        if (!whisperService.isServiceAvailable()) {
          return res.status(503).json({ error: "Whisper service not available" });
        }

        const audioBuffer = Buffer.from(audioData, 'base64');
        
        const coaching = await whisperService.providePronunciationCoaching(
          audioBuffer,
          targetPhrase,
          targetLanguage || 'en',
          userLevel || 'intermediate'
        );
        
        res.json(coaching);
      })
    );

    // Generate pronunciation exercises
    app.post("/api/ai/whisper/exercises",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { targetLanguage, weakAreas, difficulty } = req.body;
        
        const { WhisperService } = await import('../services/WhisperService');
        const whisperService = new WhisperService();
        
        if (!whisperService.isServiceAvailable()) {
          return res.status(503).json({ error: "Whisper service not available" });
        }

        const exercises = await whisperService.generatePronunciationExercises(
          targetLanguage || 'en',
          weakAreas || [],
          difficulty || 'intermediate'
        );
        
        res.json(exercises);
      })
    );

    // Advanced AI Services
    
    // Learning analytics
    app.post("/api/ai/advanced/analytics",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { userId, languageId, recentSessions } = req.body;
        
        const { advancedAIService } = await import('../services/AdvancedAIService');
        
        const analytics = await advancedAIService.generateLearningAnalytics(
          userId,
          languageId,
          recentSessions || []
        );
        
        res.json(analytics);
      })
    );

    // Personalized curriculum
    app.post("/api/ai/advanced/curriculum",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { learnerData, targetLanguage } = req.body;
        
        const { advancedAIService } = await import('../services/AdvancedAIService');
        
        const curriculum = await advancedAIService.generatePersonalizedCurriculum(
          learnerData,
          targetLanguage
        );
        
        res.json(curriculum);
      })
    );

    // Real-time assessment
    app.post("/api/ai/advanced/assessment",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { sessionData, targetLanguage, userLevel } = req.body;
        
        const { advancedAIService } = await import('../services/AdvancedAIService');
        
        const assessment = await advancedAIService.performRealTimeAssessment(
          sessionData,
          targetLanguage,
          userLevel
        );
        
        res.json(assessment);
      })
    );

    // Adaptive content generation
    app.post("/api/ai/advanced/adaptive",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { currentPerformance, userPreferences, targetLanguage } = req.body;
        
        const { advancedAIService } = await import('../services/AdvancedAIService');
        
        const adaptiveContent = await advancedAIService.generateAdaptiveContent(
          currentPerformance,
          userPreferences,
          targetLanguage
        );
        
        res.json(adaptiveContent);
      })
    );

    // Multi-modal lesson generation
    app.post("/api/ai/advanced/multimodal",
      aiLimiter,
      asyncHandler(async (req, res) => {
        if (!this.checkAuth(req, res)) return;

        const { topic, targetLanguage, learningModalities, difficulty } = req.body;
        
        const { advancedAIService } = await import('../services/AdvancedAIService');
        
        const multiModalLesson = await advancedAIService.generateMultiModalLesson(
          topic,
          targetLanguage,
          learningModalities || ['visual', 'auditory'],
          difficulty
        );
        
        res.json(multiModalLesson);
      })
    );
    
    // Get AI teacher response
    app.post("/api/ai/language-teacher", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, teacherPersonaId, message, history } = req.body;
        
        if (!languageId || !message || !Array.isArray(history)) {
          return res.status(400).json({ error: "Missing required parameters" });
        }
        
        const userId = req.user?.id;
        const { aiEnhancedServices } = await import('../services/AIEnhancedServices');
        
        const response = await aiEnhancedServices.getAITeacherResponse(
          parseInt(languageId),
          userId,
          message,
          history
        );
        
        res.json({ reply: response });
      } catch (error) {
        this.handleError(error, res);
      }
    });
    
    // Get available teacher personas
    app.get("/api/ai/language-teacher/personas/:languageId", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId } = req.params;
        
        if (!languageId) {
          return res.status(400).json({ error: "Missing language ID" });
        }
        
        const personas = await aiTeacherService.getTeacherPersonas(parseInt(languageId));
        res.json(personas);
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

/**
 * Gemini AI-related routes
 */
class GeminiAIRoutes extends BaseRoutes {
  register(app: Express): void {
    // Check pronunciation
    app.post("/api/gemini/pronunciation", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { audioUrl, originalText, languageCode } = req.body;
        const feedback = await geminiService.providePronunciationFeedback(
          audioUrl,
          originalText,
          languageCode
        );
        res.json({ feedback });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate learning path
    app.post("/api/gemini/learning-path", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageCode, currentLevel, learningGoals } = req.body;
        const learningPath = await geminiService.generateLearningPath(
          languageCode,
          currentLevel,
          learningGoals
        );
        res.json({ learningPath });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get mascot dialogue
    app.post("/api/gemini/mascot", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageCode, context } = req.body;
        const mascotResponse = await geminiService.getLanguageMascotDialogue(
          languageCode,
          context
        );
        res.json({ response: mascotResponse });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // General content generation
    app.post("/api/gemini/generate", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { prompt } = req.body;
        const content = await geminiService.generateContent(prompt);
        res.json({ content });
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

/**
 * AI-Controlled Learning Routes - Fully AI-driven language learning
 */
class AIControlledLearningRoutes extends BaseRoutes {
  register(app: Express): void {
    // Start a new AI-controlled learning session
    app.post("/api/ai-learning/session/start", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, languageName, userProfile, preferences } = req.body;
        
        const session = await intelligentSessionManager.startSession(
          req.user.id,
          languageId,
          languageName,
          userProfile,
          preferences
        );
        
        res.json(session);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Process user input in an active session
    app.post("/api/ai-learning/session/:sessionId/message", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { sessionId } = req.params;
        const { message } = req.body;
        
        const response = await intelligentSessionManager.processUserInput(sessionId, message);
        
        res.json(response);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get session status
    app.get("/api/ai-learning/session/:sessionId/status", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { sessionId } = req.params;
        const status = intelligentSessionManager.getSessionStatus(sessionId);
        
        if (!status) {
          return res.status(404).json({ error: "Session not found" });
        }
        
        res.json(status);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Complete a learning session
    app.post("/api/ai-learning/session/:sessionId/complete", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { sessionId } = req.params;
        const summary = await intelligentSessionManager.completeSession(sessionId);
        
        res.json(summary);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get AI recommendations for what to learn next
    app.post("/api/ai-learning/recommendations", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, userProfile } = req.body;
        
        const recommendation = await aiLearningOrchestrator.determineNextLearningActivity(
          req.user.id,
          languageId,
          userProfile
        );
        
        res.json(recommendation);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate personalized curriculum
    app.post("/api/ai-learning/curriculum", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, languageName, userProfile, timeframe } = req.body;
        
        const curriculum = await aiLearningOrchestrator.generatePersonalizedCurriculum(
          req.user.id,
          languageId,
          languageName,
          userProfile,
          timeframe
        );
        
        res.json(curriculum);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get AI-powered learning insights
    app.post("/api/ai-learning/insights", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageId, userProfile, recentSessions } = req.body;
        
        const insights = await aiLearningOrchestrator.getLearningInsights(
          req.user.id,
          languageId,
          userProfile,
          recentSessions
        );
        
        res.json(insights);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // AI Content Generation Routes
    
    // Generate a lesson
    app.post("/api/ai-content/lesson", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, topic, difficulty, userProfile } = req.body;
        
        const lesson = await aiContentGenerator.generateLesson(
          languageName,
          topic,
          difficulty,
          userProfile
        );
        
        res.json(lesson);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate vocabulary
    app.post("/api/ai-content/vocabulary", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, topic, difficulty, count } = req.body;
        
        const vocabulary = await aiContentGenerator.generateVocabulary(
          languageName,
          topic,
          difficulty,
          count || 10
        );
        
        res.json(vocabulary);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate exercises
    app.post("/api/ai-content/exercises", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, concept, difficulty, exerciseType, count } = req.body;
        
        const exercises = await aiContentGenerator.generateExercises(
          languageName,
          concept,
          difficulty,
          exerciseType,
          count || 5
        );
        
        res.json(exercises);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate grammar explanation
    app.post("/api/ai-content/grammar", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, grammarConcept, difficulty } = req.body;
        
        const grammar = await aiContentGenerator.generateGrammarExplanation(
          languageName,
          grammarConcept,
          difficulty
        );
        
        res.json(grammar);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate conversation prompts
    app.post("/api/ai-content/conversation", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, scenario, difficulty } = req.body;
        
        const prompts = await aiContentGenerator.generateConversationPrompts(
          languageName,
          scenario,
          difficulty
        );
        
        res.json(prompts);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate assessment
    app.post("/api/ai-content/assessment", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, topics, difficulty, skillTypes } = req.body;
        
        const assessment = await aiContentGenerator.generateAssessment(
          languageName,
          topics,
          difficulty,
          skillTypes
        );
        
        res.json(assessment);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Generate cultural content
    app.post("/api/ai-content/cultural", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { languageName, topic } = req.body;
        
        const cultural = await aiContentGenerator.generateCulturalContent(
          languageName,
          topic
        );
        
        res.json(cultural);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // AI Performance Analysis Routes
    
    // Analyze a response
    app.post("/api/ai-performance/analyze", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { userResponse, expectedAnswer, context } = req.body;
        
        const analysis = await aiPerformanceAnalyzer.analyzeResponse(
          userResponse,
          expectedAnswer,
          context
        );
        
        res.json(analysis);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get performance trends
    app.get("/api/ai-performance/trends", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const timeRange = (req.query.timeRange as string) || 'week';
        
        const trends = aiPerformanceAnalyzer.getPerformanceTrends(
          req.user.id,
          timeRange as 'day' | 'week' | 'month' | 'all'
        );
        
        res.json(trends);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get AI insights
    app.post("/api/ai-performance/insights", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { userProfile } = req.body;
        
        const insights = await aiPerformanceAnalyzer.getAIInsights(
          req.user.id,
          userProfile
        );
        
        res.json(insights);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get difficulty recommendation
    app.post("/api/ai-performance/difficulty-recommendation", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { currentDifficulty } = req.body;
        
        const recommendation = aiPerformanceAnalyzer.recommendDifficultyAdjustment(
          req.user.id,
          currentDifficulty
        );
        
        res.json(recommendation);
      } catch (error) {
        this.handleError(error, res);
      }
    });
  }
}

// Create and export router instance
export const router = new Router();

// For backward compatibility
export async function registerRoutes(app: Express): Promise<Server> {
  return router.registerRoutes(app);
}