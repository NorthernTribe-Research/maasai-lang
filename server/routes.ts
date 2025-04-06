import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertUserLessonSchema, insertUserLanguageSchema } from "@shared/schema";
import { generateExercise, checkTranslation, generateLanguageTip, generateStudyPlan } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Initialize the database with seed data
  await storage.initializeData();

  // Get all available languages
  app.get("/api/languages", async (_req, res, next) => {
    try {
      const languages = await storage.getAllLanguages();
      res.json(languages);
    } catch (error) {
      next(error);
    }
  });

  // Get user languages (languages being learned)
  app.get("/api/user/languages", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const userLanguages = await storage.getUserLanguages(req.user.id);
      res.json(userLanguages);
    } catch (error) {
      next(error);
    }
  });

  // Add a language to learn
  app.post("/api/user/languages", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const validatedData = insertUserLanguageSchema.parse({
        userId: req.user.id,
        languageId: req.body.languageId,
      });

      const userLanguage = await storage.addUserLanguage(validatedData);
      res.status(201).json(userLanguage);
    } catch (error) {
      next(error);
    }
  });

  // Get lessons for a language
  app.get("/api/languages/:languageId/lessons", async (req, res, next) => {
    try {
      const languageId = parseInt(req.params.languageId);
      const lessons = await storage.getLessonsByLanguage(languageId);
      res.json(lessons);
    } catch (error) {
      next(error);
    }
  });

  // Get user's lesson progress for a language
  app.get("/api/user/languages/:languageId/lessons", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const languageId = parseInt(req.params.languageId);
      const userLessons = await storage.getUserLessonsForLanguage(req.user.id, languageId);
      res.json(userLessons);
    } catch (error) {
      next(error);
    }
  });

  // Start a lesson
  app.post("/api/user/lessons", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const validatedData = insertUserLessonSchema.parse({
        userId: req.user.id,
        lessonId: req.body.lessonId,
      });

      const userLesson = await storage.startUserLesson(validatedData);
      res.status(201).json(userLesson);
    } catch (error) {
      next(error);
    }
  });

  // Complete a lesson
  app.put("/api/user/lessons/:lessonId/complete", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const lessonId = parseInt(req.params.lessonId);
      const progress = z.number().min(0).max(100).parse(req.body.progress);
      
      const userLesson = await storage.completeUserLesson(req.user.id, lessonId, progress);
      res.json(userLesson);
    } catch (error) {
      next(error);
    }
  });

  // Get daily challenge
  app.get("/api/user/daily-challenge", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const dailyChallenge = await storage.getDailyChallenge(req.user.id);
      res.json(dailyChallenge);
    } catch (error) {
      next(error);
    }
  });

  // Complete daily challenge
  app.post("/api/user/daily-challenge/complete", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const challengeId = z.number().parse(req.body.challengeId);
      const isCorrect = z.boolean().parse(req.body.isCorrect);
      
      const result = await storage.completeDailyChallenge(req.user.id, challengeId, isCorrect);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (_req, res, next) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      next(error);
    }
  });

  // Get user achievements
  app.get("/api/user/achievements", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const achievements = await storage.getUserAchievements(req.user.id);
      res.json(achievements);
    } catch (error) {
      next(error);
    }
  });

  // AI-powered API routes
  
  // Generate practice exercise
  app.post("/api/practice/generate", async (req, res, next) => {
    try {
      const schema = z.object({
        language: z.string(),
        level: z.string().optional().default("beginner"),
        type: z.string()
      });
      
      const { language, level, type } = schema.parse(req.body);
      const exercise = await generateExercise(language, level, type);
      res.json(exercise);
    } catch (error) {
      next(error);
    }
  });

  // Check translation
  app.post("/api/practice/check-translation", async (req, res, next) => {
    try {
      const schema = z.object({
        original: z.string(),
        translation: z.string(),
        language: z.string()
      });
      
      const { original, translation, language } = schema.parse(req.body);
      const result = await checkTranslation(original, translation, language);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Generate language tip
  app.get("/api/tips/:language", async (req, res, next) => {
    try {
      const language = req.params.language;
      const tip = await generateLanguageTip(language);
      res.json({ tip });
    } catch (error) {
      next(error);
    }
  });

  // Generate personalized study plan
  app.post("/api/study-plan", async (req, res, next) => {
    try {
      const schema = z.object({
        language: z.string(),
        level: z.string().optional().default("beginner"),
        interests: z.array(z.string()).optional().default([]),
        timeAvailable: z.number().min(5).max(180)
      });
      
      const { language, level, interests, timeAvailable } = schema.parse(req.body);
      const plan = await generateStudyPlan(language, level, interests, timeAvailable);
      res.json(plan);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
