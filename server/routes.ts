import type { Express } from "express";
import type { Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { router } from "./routes/index";

/**
 * Register all application routes
 * @param app Express application
 * @returns HTTP server
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Initialize the database with seed data
  await storage.initializeData();

  // Register all routes using the router
  return router.registerRoutes(app);
}
