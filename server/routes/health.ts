import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Health Check Service
 * Comprehensive health monitoring for all system dependencies
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

const router = Router();

interface DependencyStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  message?: string;
  lastChecked: string;
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: {
    database: DependencyStatus;
    gemini?: DependencyStatus;
    openai?: DependencyStatus;
  };
  metrics: SystemMetrics;
}

/**
 * Check database connectivity
 * Requirements: 11.3
 */
async function checkDatabase(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    // Simple query to check connectivity
    await db.execute(sql`SELECT 1`);
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime < 1000 ? 'up' : 'degraded',
      responseTime,
      message: responseTime >= 1000 ? 'Slow response time' : undefined,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check Gemini AI service availability
 * Requirements: 11.5
 */
async function checkGemini(): Promise<DependencyStatus> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return {
      status: 'down',
      responseTime: 0,
      message: 'API key not configured',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    // Simple API check - just verify the endpoint is reachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    
    if (response.ok) {
      return {
        status: responseTime < 2000 ? 'up' : 'degraded',
        responseTime,
        message: responseTime >= 2000 ? 'Slow response time' : undefined,
        lastChecked: new Date().toISOString(),
      };
    }
    
    return {
      status: 'down',
      responseTime,
      message: `HTTP ${response.status}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Service unavailable',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Check OpenAI service availability
 * Requirements: 11.5
 */
async function checkOpenAI(): Promise<DependencyStatus> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      status: 'down',
      responseTime: 0,
      message: 'API key not configured',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    // Simple API check - just verify the endpoint is reachable
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    
    if (response.ok) {
      return {
        status: responseTime < 2000 ? 'up' : 'degraded',
        responseTime,
        message: responseTime >= 2000 ? 'Slow response time' : undefined,
        lastChecked: new Date().toISOString(),
      };
    }
    
    return {
      status: 'down',
      responseTime,
      message: `HTTP ${response.status}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Service unavailable',
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Get system metrics
 * Requirements: 11.6
 */
function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  const totalMem = memUsage.heapTotal;
  const usedMem = memUsage.heapUsed;
  
  return {
    memory: {
      used: usedMem,
      total: totalMem,
      percentage: (usedMem / totalMem) * 100,
    },
    cpu: {
      usage: process.cpuUsage().user / 1000000, // Convert to seconds
    },
    uptime: process.uptime(),
  };
}

/**
 * Comprehensive health check endpoint
 * Requirements: 11.1, 11.2, 11.7
 */
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Run all health checks with timeout
    const timeout = 5000; // 5 seconds max
    const healthCheckPromise = Promise.all([
      checkDatabase(),
      checkGemini(),
      checkOpenAI(),
    ]);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });
    
    const [database, gemini, openai] = await Promise.race([
      healthCheckPromise,
      timeoutPromise,
    ]);
    
    const metrics = getSystemMetrics();
    
    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Critical dependency: database
    if (database.status === 'down') {
      status = 'unhealthy';
    } else if (database.status === 'degraded') {
      status = 'degraded';
    }
    
    // AI services are important but not critical
    if (gemini?.status === 'down' || openai?.status === 'down') {
      if (status === 'healthy') {
        status = 'degraded';
      }
    }
    
    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        database,
        gemini,
        openai,
      },
      metrics,
    };
    
    const responseTime = Date.now() - startTime;
    logger.info('Health check completed', {
      status,
      responseTime,
      dependencies: {
        database: database.status,
        gemini: gemini?.status,
        openai: openai?.status,
      },
    });
    
    // Return appropriate HTTP status code
    const httpStatus = status === 'unhealthy' ? 503 : 200;
    res.status(httpStatus).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * Simple liveness probe for container orchestration
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * Readiness probe - checks if app is ready to serve traffic
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Quick database check
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;
