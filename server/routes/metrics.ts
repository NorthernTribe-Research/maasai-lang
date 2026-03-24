import { Router, Request, Response } from 'express';
import { metricsCollector } from '../utils/MetricsCollector';

/**
 * Metrics endpoint for Prometheus scraping
 * Requirements: 12.6
 */

const router = Router();

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metricsCollector.exportPrometheus());
});

/**
 * JSON metrics endpoint for debugging
 */
router.get('/metrics/json', (req: Request, res: Response) => {
  res.json(metricsCollector.getMetrics());
});

/**
 * Metrics summary endpoint
 */
router.get('/metrics/summary', (req: Request, res: Response) => {
  res.json(metricsCollector.getSummary());
});

export default router;
