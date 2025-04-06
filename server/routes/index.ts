import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { 
  userService, 
  languageService, 
  lessonService, 
  achievementService,
  challengeService, 
  openAIService 
} from "../services";
import { User } from "@shared/schema";

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
    // Generate an exercise
    app.post("/api/ai/exercise", async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      try {
        const { language, level, type } = req.body;
        const exercise = await openAIService.generateExercise(language, level, type);
        res.json(exercise);
      } catch (error) {
        this.handleError(error, res);
      }
    });

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
  }
}

// Create and export router instance
export const router = new Router();

// For backward compatibility
export async function registerRoutes(app: Express): Promise<Server> {
  return router.registerRoutes(app);
}