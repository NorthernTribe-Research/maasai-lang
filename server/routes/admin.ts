import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "../services/AdminService";

const router = Router();

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
};

// Get admin stats
router.get("/stats", isAdmin, async (req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats || {
      totalUsers: 0,
      activeUsers: 0,
      completedLessons: 0,
      totalLanguages: 0
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin stats", error: (error as Error).message });
  }
});

export default router;
