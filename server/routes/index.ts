import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../auth";
import { 
  userService, 
  languageService, 
  lessonService, 
  achievementService,
  challengeService, 
  openAIService,
  geminiService,
  adminService
} from "../services";
import { aiLimiter } from "../middleware/security";

/**
 * Main router class that registers all application routes
 */
export class Router {
  async registerRoutes(app: Express): Promise<Server> {
    setupAuth(app);
    
    // Register specific routes
    this.registerLanguageRoutes(app);
    this.registerLessonRoutes(app);
    this.registerAchievementRoutes(app);
    this.registerChallengeRoutes(app);
    this.registerAIRoutes(app);
    
    // Admin routes
    const adminRouter = (await import("./admin")).default;
    app.use("/api/admin", adminRouter);
    
    const server = createServer(app);
    return server;
  }

  private checkAuth(req: Request, res: Response): boolean {
    if (!req.isAuthenticated()) {
      res.status(401).json({ message: "Not authenticated" });
      return false;
    }
    return true;
  }

  private registerLanguageRoutes(app: Express) {
    app.get("/api/languages", async (_req, res) => {
      try {
        const languages = await languageService.getAllLanguages();
        res.json(languages);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch languages" });
      }
    });

    app.get("/api/user/languages", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const userLanguages = await languageService.getUserLanguages(req.user!.id);
        res.json(userLanguages);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user languages" });
      }
    });

    app.post("/api/user/languages", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const userLanguage = await languageService.addUserLanguage({
          userId: req.user!.id,
          languageId: req.body.languageId,
          level: req.body.level || 1,
          progress: 0,
          isActive: true
        });
        res.status(201).json(userLanguage);
      } catch (error) {
        res.status(500).json({ message: "Failed to add language" });
      }
    });
  }

  private registerLessonRoutes(app: Express) {
    app.get("/api/languages/:languageId/lessons", async (req, res) => {
      try {
        const lessons = await lessonService.getLessonsByLanguage(parseInt(req.params.languageId));
        res.json(lessons);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch lessons" });
      }
    });

    app.get("/api/user/languages/:languageId/lessons", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const userLessons = await lessonService.getUserLessonsForLanguage(
          req.user!.id,
          parseInt(req.params.languageId)
        );
        res.json(userLessons);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user lessons" });
      }
    });

    app.patch("/api/user/lessons/:lessonId", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const userLesson = await lessonService.completeUserLesson(
          req.user!.id,
          parseInt(req.params.lessonId),
          req.body.progress
        );
        res.json(userLesson);
      } catch (error) {
        res.status(500).json({ message: "Failed to update lesson progress" });
      }
    });
  }

  private registerAchievementRoutes(app: Express) {
    app.get("/api/achievements", async (_req, res) => {
      try {
        const achievements = await achievementService.getAllAchievements();
        res.json(achievements);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch achievements" });
      }
    });

    app.get("/api/user/achievements", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const userAchievements = await achievementService.getUserAchievements(req.user!.id);
        res.json(userAchievements);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch user achievements" });
      }
    });
  }

  private registerChallengeRoutes(app: Express) {
    app.get("/api/user/daily-challenge", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const dailyChallenge = await challengeService.getDailyChallenge(req.user!.id);
        res.json(dailyChallenge);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch daily challenge" });
      }
    });

    app.post("/api/user/daily-challenge/:challengeId/complete", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const result = await challengeService.completeDailyChallenge(
          req.user!.id,
          parseInt(req.params.challengeId),
          req.body.isCorrect
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Failed to complete challenge" });
      }
    });

    app.get("/api/leaderboard", async (_req, res) => {
      try {
        const leaderboard = await challengeService.getLeaderboard();
        res.json(leaderboard);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch leaderboard" });
      }
    });
  }

  private registerAIRoutes(app: Express) {
    app.post("/api/ai/exercise", aiLimiter, async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const { language, level, type } = req.body;
        const exercise = await openAIService.generateExercise(language, level, type);
        res.json(exercise);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate exercise" });
      }
    });

    app.post("/api/ai/vocabulary", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const { language, theme, level, count } = req.body;
        const vocabulary = await geminiService.generateVocabularyList(language, theme, level, count);
        res.json(vocabulary);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate vocabulary" });
      }
    });

    app.post("/api/ai/grammar", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const { language, topic, level } = req.body;
        const grammar = await geminiService.generateGrammarExplanation(language, topic, level);
        res.json(grammar);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate grammar explanation" });
      }
    });
  }
}

export const router = new Router();
