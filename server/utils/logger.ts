export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

type LogFormat = "text" | "json";

type LogPayload = {
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO" | "DEBUG";
  message: string;
  meta?: unknown;
  service: string;
};

const SENSITIVE_KEYS = new Set([
  "token",
  "password",
  "authorization",
  "cookie",
  "session",
  "secret",
  "api_key",
  "apikey",
  "jwt",
]);

class Logger {
  private level: LogLevel;
  private format: LogFormat;
  private webhookUrl?: string;
  private serviceName: string;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.format = process.env.LOG_FORMAT?.toLowerCase() === "json" ? "json" : "text";
    this.webhookUrl = process.env.LOG_WEBHOOK_URL;
    this.serviceName = process.env.LOG_SERVICE_NAME || "linguamaster-api";
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private redactMeta(meta: unknown): unknown {
    if (Array.isArray(meta)) {
      return meta.map((item) => this.redactMeta(item));
    }

    if (meta && typeof meta === "object") {
      const redacted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
          redacted[key] = "[REDACTED]";
        } else {
          redacted[key] = this.redactMeta(value);
        }
      }
      return redacted;
    }

    return meta;
  }

  private buildPayload(level: LogPayload["level"], message: string, meta?: unknown): LogPayload {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta: meta === undefined ? undefined : this.redactMeta(meta),
      service: this.serviceName,
    };
  }

  private formatText(payload: LogPayload): string {
    const metaStr = payload.meta !== undefined ? ` ${JSON.stringify(payload.meta)}` : "";
    return `[${payload.timestamp}] ${payload.level}: ${payload.message}${metaStr}`;
  }

  private writeConsole(payload: LogPayload): void {
    if (this.format === "json") {
      const line = JSON.stringify(payload);
      if (payload.level === "ERROR") {
        console.error(line);
      } else if (payload.level === "WARN") {
        console.warn(line);
      } else {
        console.log(line);
      }
      return;
    }

    const line = this.formatText(payload);
    if (payload.level === "ERROR") {
      console.error(line);
    } else if (payload.level === "WARN") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  private async sendWebhook(payload: LogPayload): Promise<void> {
    if (!this.webhookUrl || (payload.level !== "ERROR" && payload.level !== "WARN")) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch {
      // Keep logging non-blocking even when alert sink is unavailable.
    }
  }

  private log(level: LogPayload["level"], threshold: LogLevel, message: string, meta?: unknown): void {
    if (!this.shouldLog(threshold)) {
      return;
    }

    const payload = this.buildPayload(level, message, meta);
    this.writeConsole(payload);
    void this.sendWebhook(payload);
  }

  error(message: string, meta?: unknown): void {
    this.log("ERROR", LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log("WARN", LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log("INFO", LogLevel.INFO, message, meta);
  }

  debug(message: string, meta?: unknown): void {
    this.log("DEBUG", LogLevel.DEBUG, message, meta);
  }
}

export const logger = new Logger();
