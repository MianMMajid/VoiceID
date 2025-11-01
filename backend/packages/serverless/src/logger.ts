/**
 * Logging and Monitoring System
 * Provides structured logging, distributed tracing, and performance metrics
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  trace?: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  serviceName: string;
  environment: string;
  minLevel: LogLevel;
  enableConsole: boolean;
  enableCloudWatch: boolean;
  enableStructuredLogging: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  serviceName: 'vlo-service',
  environment: process.env.NODE_ENV || 'development',
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableCloudWatch: false,
  enableStructuredLogging: true,
};

/**
 * Logger class for structured logging
 */
export class Logger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set persistent context for all log entries
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          },
        }
      : {};

    this.log(LogLevel.ERROR, message, { ...context, ...errorContext });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    // Check if log level is enabled
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: { ...this.context, ...context },
    };

    // Add trace context if available
    const traceContext = this.getTraceContext();
    if (traceContext) {
      entry.trace = traceContext;
    }

    // Output log
    this.output(entry);
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    if (this.config.enableConsole) {
      if (this.config.enableStructuredLogging) {
        // Structured JSON logging
        console.log(JSON.stringify(entry));
      } else {
        // Human-readable logging
        const timestamp = new Date(entry.timestamp).toISOString();
        const contextStr = entry.context
          ? ` ${JSON.stringify(entry.context)}`
          : '';
        console.log(`[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`);
      }
    }

    // CloudWatch logging would be implemented here
    if (this.config.enableCloudWatch) {
      this.sendToCloudWatch(entry);
    }
  }

  /**
   * Send log to CloudWatch (placeholder for actual implementation)
   */
  private sendToCloudWatch(entry: LogEntry): void {
    // In production, this would use AWS SDK to send logs to CloudWatch
    // For now, this is a placeholder
  }

  /**
   * Get trace context from OpenTelemetry or similar
   */
  private getTraceContext(): { traceId?: string; spanId?: string } | null {
    // In production, this would extract trace context from OpenTelemetry
    // For now, return null
    return null;
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create a child logger with additional context
 */
export function createLogger(
  serviceName: string,
  context?: Record<string, any>
): Logger {
  const childLogger = new Logger({ serviceName });
  if (context) {
    childLogger.setContext(context);
  }
  return childLogger;
}
