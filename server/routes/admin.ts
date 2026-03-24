import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../services/AdminService";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};

// ── Stats ──────────────────────────────────────────────────────────────────────
router.get("/stats", isAdmin, async (_req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats || { totalUsers: 0, activeUsers: 0, completedLessons: 0, totalLanguages: 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin stats", error: (error as Error).message });
  }
});

// ── Users ──────────────────────────────────────────────────────────────────────
router.get("/users", isAdmin, async (_req, res) => {
  try {
    const users = await storage.getAllUsers();
    const safe = users.map(({ password: _, ...u }) => u);
    res.json(safe);
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.patch("/users/:userId/admin", isAdmin, async (req, res) => {
  const { isAdmin: makeAdmin } = req.body;
  if (typeof makeAdmin !== "boolean") return res.status(400).json({ message: "isAdmin must be a boolean" });
  try {
    const { db } = await import("../db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [updated] = await db.update(users).set({ isAdmin: makeAdmin }).where(eq(users.id, req.params.userId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  } catch {
    res.status(500).json({ message: "Failed to update user admin status" });
  }
});

// ── Languages ──────────────────────────────────────────────────────────────────
router.get("/languages", isAdmin, async (_req, res) => {
  try {
    const langs = await storage.getAllLanguages();
    res.json(langs);
  } catch {
    res.status(500).json({ message: "Failed to fetch languages" });
  }
});

router.post("/languages", isAdmin, async (req, res) => {
  const schema = z.object({
    code: z.string().min(2).max(10),
    name: z.string().min(1).max(100),
    flag: z.string().min(1).max(10),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
  try {
    const lang = await storage.addLanguage(parsed.data);
    res.status(201).json(lang);
  } catch (error: any) {
    if (error.message?.includes("unique")) return res.status(409).json({ message: "Language code already exists" });
    res.status(500).json({ message: "Failed to create language" });
  }
});

// ── Lessons ────────────────────────────────────────────────────────────────────
router.get("/lessons", isAdmin, async (_req, res) => {
  try {
    const lessonList = await storage.getAllLessons();
    res.json(lessonList);
  } catch {
    res.status(500).json({ message: "Failed to fetch lessons" });
  }
});

router.post("/lessons", isAdmin, async (req, res) => {
  const schema = z.object({
    languageId: z.number().int().positive(),
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    content: z.string().optional(),
    level: z.number().int().min(1).default(1),
    type: z.string().min(1).max(50),
    xpReward: z.number().int().min(0).default(10),
    order: z.number().int().min(0),
    duration: z.number().int().min(1).default(10),
    icon: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
  try {
    const lesson = await storage.createLesson(parsed.data);
    res.status(201).json(lesson);
  } catch {
    res.status(500).json({ message: "Failed to create lesson" });
  }
});

router.patch("/lessons/:lessonId", isAdmin, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    level: z.number().int().min(1).optional(),
    type: z.string().optional(),
    xpReward: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    duration: z.number().int().min(1).optional(),
    icon: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
  try {
    const lesson = await storage.updateLesson(parseInt(req.params.lessonId), parsed.data);
    res.json(lesson);
  } catch (error: any) {
    if (error.message === "Lesson not found") return res.status(404).json({ message: "Lesson not found" });
    res.status(500).json({ message: "Failed to update lesson" });
  }
});

router.delete("/lessons/:lessonId", isAdmin, async (req, res) => {
  try {
    await storage.deleteLesson(parseInt(req.params.lessonId));
    res.json({ message: "Lesson deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete lesson" });
  }
});

// ── Bulk Seed ──────────────────────────────────────────────────────────────────
router.post("/seed-lessons", isAdmin, async (_req, res) => {
  try {
    const { seedLessons } = await import("../scripts/seed-lessons");
    await seedLessons();
    res.json({ message: "Lessons seeded successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to seed lessons", error: (error as Error).message });
  }
});

// ── Migrations ─────────────────────────────────────────────────────────────────
router.post("/migrate/user-settings", isAdmin, async (_req, res) => {
  try {
    const { runStartupMigrations } = await import("../utils/migrations");
    await runStartupMigrations();
    res.json({ message: "Startup migrations executed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to execute startup migrations", error: (error as Error).message });
  }
});

export default router;
