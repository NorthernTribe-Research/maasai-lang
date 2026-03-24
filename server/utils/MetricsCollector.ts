import { logger } from './logger';

/**
 * Metrics Collector
 * Application performance metrics collection and exposure
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  values: number[];
}

interface HTTPMetrics {
  requestCount: number;
  requestDuration: HistogramData;
  statusCodes: Record<number, number>;
  methodCounts: Record<string, number>;
  pathCounts: Record<string, number>;
}

interface DatabaseMetrics {
  queryCount: number;
  queryDuration: HistogramData;
  slowQueries: number;
  connectionPoolUsage: number;
}

interface AIMetrics {
  requestCount: Record<string, number>;
  requestDuration: Record<string, HistogramData>;
  tokenUsage: Record<string, number>;
  estimatedCost: Record<string, number>;
  errorCount: Record<string, number>;
}

interface SystemMetrics {
  memoryUsage: number;
  memoryTotal: number;
  cpuUsage: number;
  activeConnections: number;
  uptime: number;
}

interface Metrics {
  http: HTTPMetrics;
  database: DatabaseMetrics;
  ai: AIMetrics;
  system: SystemMetrics;
  startTime: number;
}

class MetricsCollector {
  private metrics: Metrics;
  private static instance: MetricsCollector;

  private constructor() {
    this.metrics = this.initializeMetrics();
    
    // Update system metrics every 10 seconds
    setInterval(() => this.updateSystemMetrics(), 10000);
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): Metrics {
    return {
      http: {
        requestCount: 0,
        requestDuration: this.createHistogram(),
        statusCodes: {},
        methodCounts: {},
        pathCounts: {},
      },
      database: {
        queryCount: 0,
        queryDuration: this.createHistogram(),
        slowQueries: 0,
        connectionPoolUsage: 0,
      },
      ai: {
        requestCount: {},
        requestDuration: {},
        tokenUsage: {},
        estimatedCost: {},
        errorCount: {},
      },
      system: {
        memoryUsage: 0,
        memoryTotal: 0,
        cpuUsage: 0,
        activeConnections: 0,
        uptime: 0,
      },
      startTime: Date.now(),
    };
  }

  private createHistogram(): HistogramData {
    return {
      count: 0,
      sum: 0,
      min: Infinity,
      max: 0,
      mean: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      values: [],
    };
  }

  private updateHistogram(histogram: HistogramData, value: number): void {
    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);
    histogram.mean = histogram.sum / histogram.count;
    
    // Store values for percentile calculation (limit to last 1000 values)
    histogram.values.push(value);
    if (histogram.values.length > 1000) {
      histogram.values.shift();
    }
    
    // Calculate percentiles
    const sorted = [...histogram.values].sort((a, b) => a - b);
    histogram.p50 = this.percentile(sorted, 50);
    histogram.p95 = this.percentile(sorted, 95);
    histogram.p99 = this.percentile(sorted, 99);
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Record HTTP request metrics
   * Requirements: 12.1
   */
  recordRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.metrics.http.requestCount++;
    this.updateHistogram(this.metrics.http.requestDuration, duration);
    
    // Track status codes
    this.metrics.http.statusCodes[statusCode] = 
      (this.metrics.http.statusCodes[statusCode] || 0) + 1;
    
    // Track methods
    this.metrics.http.methodCounts[method] = 
      (this.metrics.http.methodCounts[method] || 0) + 1;
    
    // Track paths (normalize to avoid explosion)
    const normalizedPath = this.normalizePath(path);
    this.metrics.http.pathCounts[normalizedPath] = 
      (this.metrics.http.pathCounts[normalizedPath] || 0) + 1;
  }

  private normalizePath(path: string): string {
    // Replace IDs and UUIDs with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
  }

  /**
   * Record database query metrics
   * Requirements: 12.2
   */
  recordQuery(query: string, duration: number): void {
    this.metrics.database.queryCount++;
    this.updateHistogram(this.metrics.database.queryDuration, duration);
    
    // Track slow queries (> 1 second)
    if (duration > 1000) {
      this.metrics.database.slowQueries++;
      logger.warn('Slow query detected', {
        duration,
        query: query.substring(0, 100),
      });
    }
  }

  /**
   * Record AI service metrics
   * Requirements: 12.3
   */
  recordAIRequest(service: string, duration: number, tokens: number, error?: boolean): void {
    // Initialize service metrics if needed
    if (!this.metrics.ai.requestCount[service]) {
      this.metrics.ai.requestCount[service] = 0;
      this.metrics.ai.requestDuration[service] = this.createHistogram();
      this.metrics.ai.tokenUsage[service] = 0;
      this.metrics.ai.estimatedCost[service] = 0;
      this.metrics.ai.errorCount[service] = 0;
    }
    
    this.metrics.ai.requestCount[service]++;
    this.updateHistogram(this.metrics.ai.requestDuration[service], duration);
    this.metrics.ai.tokenUsage[service] += tokens;
    
    // Estimate cost (rough estimates)
    const costPerToken = service === 'gemini' ? 0.00001 : 0.00003;
    this.metrics.ai.estimatedCost[service] += tokens * costPerToken;
    
    if (error) {
      this.metrics.ai.errorCount[service]++;
    }
  }

  /**
   * Update connection pool usage
   */
  updateConnectionPoolUsage(usage: number): void {
    this.metrics.database.connectionPoolUsage = usage;
  }

  /**
   * Update active connections
   * Requirements: 12.5
   */
  updateActiveConnections(count: number): void {
    this.metrics.system.activeConnections = count;
  }

  /**
   * Update system metrics
   * Requirements: 12.4
   */
  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = memUsage.heapUsed;
    this.metrics.system.memoryTotal = memUsage.heapTotal;
    this.metrics.system.cpuUsage = process.cpuUsage().user / 1000000;
    this.metrics.system.uptime = process.uptime();
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    this.updateSystemMetrics();
    return this.metrics;
  }

  /**
   * Export metrics in Prometheus format
   * Requirements: 12.6
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const timestamp = Date.now();
    
    // HTTP metrics
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    lines.push(`http_requests_total ${this.metrics.http.requestCount} ${timestamp}`);
    
    lines.push('# HELP http_request_duration_seconds HTTP request duration');
    lines.push('# TYPE http_request_duration_seconds histogram');
    lines.push(`http_request_duration_seconds_sum ${this.metrics.http.requestDuration.sum / 1000} ${timestamp}`);
    lines.push(`http_request_duration_seconds_count ${this.metrics.http.requestDuration.count} ${timestamp}`);
    
    // Percentiles
    lines.push('# HELP http_request_duration_p95 95th percentile request duration');
    lines.push('# TYPE http_request_duration_p95 gauge');
    lines.push(`http_request_duration_p95 ${this.metrics.http.requestDuration.p95 / 1000} ${timestamp}`);
    
    lines.push('# HELP http_request_duration_p99 99th percentile request duration');
    lines.push('# TYPE http_request_duration_p99 gauge');
    lines.push(`http_request_duration_p99 ${this.metrics.http.requestDuration.p99 / 1000} ${timestamp}`);
    
    // Status codes
    for (const [code, count] of Object.entries(this.metrics.http.statusCodes)) {
      lines.push(`http_requests_total{status="${code}"} ${count} ${timestamp}`);
    }
    
    // Database metrics
    lines.push('# HELP db_queries_total Total number of database queries');
    lines.push('# TYPE db_queries_total counter');
    lines.push(`db_queries_total ${this.metrics.database.queryCount} ${timestamp}`);
    
    lines.push('# HELP db_query_duration_seconds Database query duration');
    lines.push('# TYPE db_query_duration_seconds histogram');
    lines.push(`db_query_duration_seconds_sum ${this.metrics.database.queryDuration.sum / 1000} ${timestamp}`);
    lines.push(`db_query_duration_seconds_count ${this.metrics.database.queryDuration.count} ${timestamp}`);
    
    lines.push('# HELP db_slow_queries_total Total number of slow queries');
    lines.push('# TYPE db_slow_queries_total counter');
    lines.push(`db_slow_queries_total ${this.metrics.database.slowQueries} ${timestamp}`);
    
    // AI service metrics
    for (const [service, count] of Object.entries(this.metrics.ai.requestCount)) {
      lines.push(`ai_requests_total{service="${service}"} ${count} ${timestamp}`);
      lines.push(`ai_tokens_total{service="${service}"} ${this.metrics.ai.tokenUsage[service]} ${timestamp}`);
      lines.push(`ai_estimated_cost{service="${service}"} ${this.metrics.ai.estimatedCost[service]} ${timestamp}`);
      lines.push(`ai_errors_total{service="${service}"} ${this.metrics.ai.errorCount[service]} ${timestamp}`);
    }
    
    // System metrics
    lines.push('# HELP process_memory_bytes Process memory usage');
    lines.push('# TYPE process_memory_bytes gauge');
    lines.push(`process_memory_bytes ${this.metrics.system.memoryUsage} ${timestamp}`);
    
    lines.push('# HELP process_cpu_seconds_total Process CPU usage');
    lines.push('# TYPE process_cpu_seconds_total counter');
    lines.push(`process_cpu_seconds_total ${this.metrics.system.cpuUsage} ${timestamp}`);
    
    lines.push('# HELP process_uptime_seconds Process uptime');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${this.metrics.system.uptime} ${timestamp}`);
    
    return lines.join('\n') + '\n';
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    logger.info('Metrics reset');
  }

  /**
   * Get metrics summary for logging
   */
  getSummary(): object {
    return {
      http: {
        totalRequests: this.metrics.http.requestCount,
        avgDuration: this.metrics.http.requestDuration.mean.toFixed(2) + 'ms',
        p95Duration: this.metrics.http.requestDuration.p95.toFixed(2) + 'ms',
        p99Duration: this.metrics.http.requestDuration.p99.toFixed(2) + 'ms',
      },
      database: {
        totalQueries: this.metrics.database.queryCount,
        avgDuration: this.metrics.database.queryDuration.mean.toFixed(2) + 'ms',
        slowQueries: this.metrics.database.slowQueries,
      },
      ai: {
        services: Object.keys(this.metrics.ai.requestCount),
        totalRequests: Object.values(this.metrics.ai.requestCount).reduce((a, b) => a + b, 0),
        totalTokens: Object.values(this.metrics.ai.tokenUsage).reduce((a, b) => a + b, 0),
        estimatedCost: Object.values(this.metrics.ai.estimatedCost).reduce((a, b) => a + b, 0).toFixed(4),
      },
      system: {
        memoryUsage: (this.metrics.system.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
        uptime: this.metrics.system.uptime.toFixed(0) + 's',
      },
    };
  }
}

export const metricsCollector = MetricsCollector.getInstance();

// Log metrics summary every 5 minutes
setInterval(() => {
  logger.info('Metrics summary', metricsCollector.getSummary());
}, 5 * 60 * 1000);
