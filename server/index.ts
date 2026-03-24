import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  errorHandler, 
  notFoundHandler,
  corsMiddleware,
  securityHeaders,
  httpsEnforcement,
  validateInput,
  requestLogger
} from "./middleware";
import { compressionMiddleware } from "./middleware/compression";
import { metricsMiddleware } from "./middleware/metricsMiddleware";
import { logger } from "./utils/logger";
import { runStartupMigrations } from "./utils/migrations";
import checkConfig from "./checkConfig";
import { configManager } from "./config/ConfigurationManager";
import { db } from "./db";

// Load and validate configuration on startup
(async () => {
  try {
    await configManager.loadConfig();
    logger.info('Configuration loaded successfully');
  } catch (error) {
    logger.error('Failed to load configuration', { error });
    process.exit(1);
  }
})();

// Check configuration on startup (legacy check)
checkConfig();

const app = express();

// Compression middleware (should be early in the stack)
app.use(compressionMiddleware);

// Apply security middleware first
app.use(corsMiddleware);
app.use(securityHeaders);
app.use(httpsEnforcement);

// Metrics collection middleware
app.use(metricsMiddleware);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Input validation and sanitization
app.use(validateInput);

// Request logging middleware
app.use(requestLogger);

const SENSITIVE_LOG_KEYS = new Set([
  "token",
  "password",
  "authorization",
  "cookie",
  "session",
  "secret",
  "apikey",
  "api_key",
  "jwt",
]);

function redactSensitivePayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map(redactSensitivePayload);
  }

  if (payload && typeof payload === "object") {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (SENSITIVE_LOG_KEYS.has(key.toLowerCase())) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitivePayload(value);
      }
    }

    return redacted;
  }

  return payload;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.get("/api/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);

    return res.status(200).json({
      status: "healthy",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(503).json({
      status: "unhealthy",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

(async () => {
  try {
    // Run startup migrations
    await runStartupMigrations();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      const responseMessage = process.env.NODE_ENV === 'production' && status === 500 
        ? "Internal Server Error" 
        : message;
      
      if (status >= 500) {
        console.error('Server error:', err);
      }

      res.status(status).json({ message: responseMessage });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    app.use(notFoundHandler);
    app.use(errorHandler);

    const port = process.env.PORT || 5000;
    server.listen({
      port: Number(port),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server started on port ${port}`, {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
