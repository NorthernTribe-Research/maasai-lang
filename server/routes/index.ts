import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
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

type LessonExercise = {
  id: string;
  type: "multiple-choice";
  question: string;
  options: string[];
  correctAnswer: string;
};

type ExplainAnswerPayload = {
  summary: string;
  whyExpectedAnswerWorks: string;
  keyDifference: string;
  tips: string[];
  suggestedRetry?: string;
  source?: "ai" | "fallback";
};

type RoleplayTurn = {
  role: "user" | "assistant";
  content: string;
};

type RoleplayPayload = {
  assistantMessage: string;
  coachTip: string;
  suggestedReplies: string[];
  source?: "ai" | "fallback";
};

/**
 * Main router class that registers all application routes
 */
export class Router {
  async registerRoutes(app: Express): Promise<Server> {
    // Health check and metrics routes (no auth required)
    const healthRouter = (await import("./health")).default;
    app.use("/api", healthRouter);
    
    const metricsRouter = (await import("./metrics")).default;
    app.use("/api", metricsRouter);
    
    // API documentation routes (no auth required)
    const apiDocsRouter = (await import("./api-docs")).default;
    app.use("/api", apiDocsRouter);
    
    // Register specific routes
    this.registerLanguageRoutes(app);
    this.registerLessonRoutes(app);
    this.registerAchievementRoutes(app);
    this.registerChallengeRoutes(app);
    this.registerAIRoutes(app);
    
    // Profile routes
    const profileRouter = (await import("./profiles")).default;
    app.use("/api", profileRouter);
    
    // Curriculum and lesson routes
    const curriculumRouter = (await import("./curriculum")).default;
    app.use("/api", curriculumRouter);
    
    // Exercise routes
    const exerciseRouter = (await import("./exercises")).default;
    app.use("/api", exerciseRouter);
    
    // Practice routes
    const practiceRouter = (await import("./practice")).default;
    app.use("/api", practiceRouter);
    
    // Voice teaching routes
    const voiceRouter = (await import("./voice")).default;
    app.use("/api", voiceRouter);
    
    // Pronunciation coaching routes
    const speechRouter = (await import("./speech")).default;
    app.use("/api", speechRouter);
    
    // AI tutor routes
    const tutorRouter = (await import("./tutor")).default;
    app.use("/api", tutorRouter);
    
    // Gamification routes
    const gamificationRouter = (await import("./gamification")).default;
    app.use("/api", gamificationRouter);
    
    // Progress and analytics routes
    const progressRouter = (await import("./progress")).default;
    app.use("/api", progressRouter);
    
    // Admin routes
    const adminRouter = (await import("./admin")).default;
    app.use("/api/admin", adminRouter);
    
    // Cache management routes
    const cacheRouter = (await import("./cache")).default;
    app.use("/api/cache", cacheRouter);
    
    // Session context management routes
    const sessionsRouter = (await import("./sessions")).default;
    app.use("/api/sessions", sessionsRouter);
    
    // Learning path routes
    const learningPathRouter = (await import("./learning-path")).default;
    app.use("/api/learning-path", learningPathRouter);
    
    // User stats routes
    const userStatsRouter = (await import("./user-stats")).default;
    app.use("/api/user-stats", userStatsRouter);
    
    // User settings routes
    const userSettingsRouter = (await import("./user-settings")).default;
    app.use("/api", userSettingsRouter);
    
    // GDPR compliance routes
    const gdprRouter = (await import("./gdpr")).default;
    app.use("/api", gdprRouter);
    
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

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }) as Promise<T>;
  }

  private shuffleOptions(options: string[]): string[] {
    const cloned = [...options];
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  }

  private buildExerciseOptions(correctAnswer: string, rawOptions: unknown, language: string): string[] {
    const options = Array.isArray(rawOptions)
      ? rawOptions.filter((option) => typeof option === "string").map((option) => option.trim())
      : [];

    const unique = new Set<string>([correctAnswer.trim(), ...options]);
    const fillers = [
      "None of the above",
      "I am not sure",
      `A phrase in ${language}`,
      "Skip this question",
      "The opposite meaning",
    ];

    for (const filler of fillers) {
      if (unique.size >= 4) break;
      unique.add(filler);
    }

    const normalized = Array.from(unique).filter(Boolean).slice(0, 4);
    if (!normalized.includes(correctAnswer.trim())) {
      normalized[0] = correctAnswer.trim();
    }

    return this.shuffleOptions(normalized);
  }

  private normalizeLessonExercises(rawExercises: unknown, language: string): LessonExercise[] {
    if (!Array.isArray(rawExercises)) return [];

    return rawExercises
      .map((exercise, index) => {
        const raw = (exercise ?? {}) as Record<string, unknown>;
        const question = typeof raw.question === "string" && raw.question.trim().length > 0
          ? raw.question.trim()
          : `Choose the best translation in ${language}.`;

        const correctAnswer = Array.isArray(raw.correctAnswer)
          ? String(raw.correctAnswer[0] || "").trim()
          : String(raw.correctAnswer || "").trim();

        if (!correctAnswer) {
          return null;
        }

        return {
          id: typeof raw.id === "string" ? raw.id : `ai_ex_${Date.now()}_${index}`,
          type: "multiple-choice" as const,
          question,
          options: this.buildExerciseOptions(correctAnswer, raw.options, language),
          correctAnswer,
        };
      })
      .filter((exercise): exercise is LessonExercise => exercise !== null);
  }

  private createFallbackLessonExercises(language: string, theme: string, count: number): LessonExercise[] {
    const prompts = [
      {
        question: `Which option best matches "${theme}" in ${language}?`,
        correctAnswer: "A common daily expression",
        options: [
          "A common daily expression",
          "A math equation",
          "A weather alert",
          "A historical date",
        ],
      },
      {
        question: `Choose the most natural greeting in ${language}.`,
        correctAnswer: "A polite hello",
        options: [
          "A polite hello",
          "A goodbye phrase",
          "A complaint sentence",
          "A random noun",
        ],
      },
      {
        question: `Select the option that fits basic ${language} sentence order.`,
        correctAnswer: "Subject + verb + object",
        options: [
          "Subject + verb + object",
          "Object + object + subject",
          "Verb only",
          "No structure needed",
        ],
      },
      {
        question: `Pick the best translation strategy for a beginner ${language} learner.`,
        correctAnswer: "Focus on meaning first, then refine grammar",
        options: [
          "Focus on meaning first, then refine grammar",
          "Memorize without understanding",
          "Avoid short sentences",
          "Translate word by word only",
        ],
      },
    ];

    return Array.from({ length: count }, (_, index) => {
      const prompt = prompts[index % prompts.length];
      return {
        id: `fallback_ex_${Date.now()}_${index}`,
        type: "multiple-choice" as const,
        question: prompt.question,
        options: this.shuffleOptions(prompt.options),
        correctAnswer: prompt.correctAnswer,
      };
    });
  }

  private parseJsonObject<T>(raw: string): T | null {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }

  private normalizeStringArray(input: unknown, limit: number = 3): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const values = input
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return values.slice(0, limit);
  }

  private buildExplainAnswerFallback(params: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }): ExplainAnswerPayload {
    return {
      summary: `Your answer "${params.userAnswer}" is close, but "${params.correctAnswer}" is the expected response.`,
      whyExpectedAnswerWorks: `For this prompt, "${params.correctAnswer}" matches the target meaning and format.`,
      keyDifference: `The main gap is accuracy around the exact expected phrase for this question.`,
      tips: [
        "Read the full prompt and identify the exact intent before answering.",
        "Compare your wording with the expected meaning, not just similar words.",
        "Repeat the corrected answer once out loud to reinforce recall.",
      ],
      suggestedRetry: `Try answering again with: "${params.correctAnswer}"`,
      source: "fallback",
    };
  }

  private buildRoleplayFallback(params: {
    scenario: string;
    learnerMessage?: string;
    expectedAnswer?: string;
  }): RoleplayPayload {
    const intro = params.learnerMessage
      ? `Nice attempt. Let's continue this scenario and make your reply more natural.`
      : `Let's roleplay this scenario together: "${params.scenario}"`;

    return {
      assistantMessage: intro,
      coachTip: params.expectedAnswer
        ? `Target phrase to practice: "${params.expectedAnswer}". Keep your response short and natural.`
        : "Keep your response short, clear, and context-aware.",
      suggestedReplies: [
        "Can you repeat that slowly, please?",
        "I understand. Here is my response.",
        "Could you give me one more example?",
      ],
      source: "fallback",
    };
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
        const lessons = await lessonService.getLessonsByLanguage(parseInt(req.params.languageId as string));
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
          parseInt(req.params.languageId as string)
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
          parseInt(req.params.lessonId as string),
          req.body.progress
        );
        res.json(userLesson);
      } catch (error) {
        const statusCode = (error as any)?.statusCode;
        if (statusCode === 402 || statusCode === 403) {
          return res.status(statusCode).json({
            message: error instanceof Error ? error.message : "Lesson access restricted",
            code: (error as any)?.code || "LESSON_ACCESS_RESTRICTED",
            details: (error as any)?.details || null,
          });
        }
        res.status(500).json({ message: "Failed to update lesson progress" });
      }
    });

    app.get("/api/user/lessons/:lessonId/exercises", async (req, res) => {
      if (!this.checkAuth(req, res)) return;
      try {
        const lesson = await lessonService.getLessonById(parseInt(req.params.lessonId as string));
        if (!lesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        
        const langs = await languageService.getAllLanguages();
        const lang = langs.find(l => l.id === lesson.languageId);
        const languageName = lang?.name || "Target Language";
        const theme = lesson.title || lesson.type || "General Practice";
        const targetCount = 8;

        let exercises: LessonExercise[] = [];
        try {
          const aiExercises = await this.withTimeout(
            openAIService.generateLessonExercises({
              language: languageName,
              theme,
              level: lesson.level || 1,
              count: targetCount,
            }),
            7000,
            "Lesson exercise generation timed out",
          );

          exercises = this.normalizeLessonExercises(aiExercises, languageName);
        } catch (error) {
          console.warn("[Router] AI lesson exercise generation fallback triggered:", error);
        }

        if (exercises.length === 0) {
          exercises = this.createFallbackLessonExercises(languageName, theme, targetCount);
        }

        res.json(exercises);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate lesson exercises" });
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
          parseInt(req.params.challengeId as string),
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

    app.post("/api/ai/explain-answer", aiLimiter, async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
      const userAnswer = typeof req.body?.userAnswer === "string" ? req.body.userAnswer.trim() : "";
      const correctAnswer = typeof req.body?.correctAnswer === "string" ? req.body.correctAnswer.trim() : "";
      const exerciseType = typeof req.body?.exerciseType === "string" ? req.body.exerciseType.trim() : "language-exercise";

      if (!question || !userAnswer || !correctAnswer) {
        return res.status(400).json({
          message: "question, userAnswer, and correctAnswer are required",
        });
      }

      const fallback = this.buildExplainAnswerFallback({
        question,
        userAnswer,
        correctAnswer,
      });

      try {
        const prompt = `
You are a supportive language tutor.
Analyze the student's answer and explain the correction clearly and briefly.

Question: ${question}
Exercise Type: ${exerciseType}
Student Answer: ${userAnswer}
Expected Answer: ${correctAnswer}

Return strict JSON:
{
  "summary": "1 sentence summary of what went wrong",
  "whyExpectedAnswerWorks": "explain why expected answer is right",
  "keyDifference": "main difference between student and expected answer",
  "tips": ["tip1", "tip2", "tip3"],
  "suggestedRetry": "one short corrected attempt"
}
`;

        const completion = await this.withTimeout(
          openAIService.generateCompletion(prompt, "gpt-4o-mini", 500, 0.3),
          10000,
          "Explain-answer request timed out",
        );

        const parsed = this.parseJsonObject<Partial<ExplainAnswerPayload>>(completion);
        if (!parsed) {
          return res.json(fallback);
        }

        return res.json({
          summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0
            ? parsed.summary.trim()
            : fallback.summary,
          whyExpectedAnswerWorks:
            typeof parsed.whyExpectedAnswerWorks === "string" && parsed.whyExpectedAnswerWorks.trim().length > 0
              ? parsed.whyExpectedAnswerWorks.trim()
              : fallback.whyExpectedAnswerWorks,
          keyDifference:
            typeof parsed.keyDifference === "string" && parsed.keyDifference.trim().length > 0
              ? parsed.keyDifference.trim()
              : fallback.keyDifference,
          tips: this.normalizeStringArray(parsed.tips, 3).length > 0
            ? this.normalizeStringArray(parsed.tips, 3)
            : fallback.tips,
          suggestedRetry:
            typeof parsed.suggestedRetry === "string" && parsed.suggestedRetry.trim().length > 0
              ? parsed.suggestedRetry.trim()
              : fallback.suggestedRetry,
          source: "ai",
        } satisfies ExplainAnswerPayload);
      } catch (error) {
        console.warn("[Router] explain-answer fallback triggered:", error);
        return res.json(fallback);
      }
    });

    app.post("/api/ai/roleplay", aiLimiter, async (req, res) => {
      if (!this.checkAuth(req, res)) return;

      const scenario = typeof req.body?.scenario === "string" ? req.body.scenario.trim() : "";
      const expectedAnswer = typeof req.body?.expectedAnswer === "string" ? req.body.expectedAnswer.trim() : "";
      const learnerMessage = typeof req.body?.learnerMessage === "string"
        ? req.body.learnerMessage.trim()
        : "";

      const rawHistory: unknown[] = Array.isArray(req.body?.history) ? req.body.history : [];
      const history: RoleplayTurn[] = [];

      for (const item of rawHistory.slice(-8)) {
        const row = (item ?? {}) as Record<string, unknown>;
        const role = row.role === "assistant" ? "assistant" : row.role === "user" ? "user" : null;
        const content = typeof row.content === "string" ? row.content.trim() : "";

        if (role && content) {
          history.push({ role, content });
        }
      }

      if (!scenario) {
        return res.status(400).json({ message: "scenario is required" });
      }

      const fallback = this.buildRoleplayFallback({
        scenario,
        learnerMessage,
        expectedAnswer,
      });

      try {
        const historyText = history
          .map((turn) => `${turn.role === "assistant" ? "Tutor" : "Learner"}: ${turn.content}`)
          .join("\n");

        const prompt = `
You are running a short language-learning roleplay. Be supportive, concise, and practical.

Scenario: ${scenario}
Expected/target phrase: ${expectedAnswer || "not provided"}
Current learner message: ${learnerMessage || "(learner has not replied yet)"}
Conversation history:
${historyText || "(no history yet)"}

Return strict JSON:
{
  "assistantMessage": "your next roleplay turn",
  "coachTip": "one short coaching tip",
  "suggestedReplies": ["reply 1", "reply 2", "reply 3"]
}
`;

        const completion = await this.withTimeout(
          openAIService.generateCompletion(prompt, "gpt-4o-mini", 500, 0.6),
          10000,
          "Roleplay request timed out",
        );

        const parsed = this.parseJsonObject<Partial<RoleplayPayload>>(completion);
        if (!parsed) {
          return res.json(fallback);
        }

        return res.json({
          assistantMessage:
            typeof parsed.assistantMessage === "string" && parsed.assistantMessage.trim().length > 0
              ? parsed.assistantMessage.trim()
              : fallback.assistantMessage,
          coachTip:
            typeof parsed.coachTip === "string" && parsed.coachTip.trim().length > 0
              ? parsed.coachTip.trim()
              : fallback.coachTip,
          suggestedReplies: this.normalizeStringArray(parsed.suggestedReplies, 3).length > 0
            ? this.normalizeStringArray(parsed.suggestedReplies, 3)
            : fallback.suggestedReplies,
          source: "ai",
        } satisfies RoleplayPayload);
      } catch (error) {
        console.warn("[Router] roleplay fallback triggered:", error);
        return res.json(fallback);
      }
    });
  }
}

export const router = new Router();
