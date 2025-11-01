import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, createLogger } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log info messages', () => {
    const logger = new Logger({ enableStructuredLogging: false });
    logger.info('Test message');

    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    expect(logOutput).toContain('INFO');
    expect(logOutput).toContain('Test message');
  });

  it('should log with context', () => {
    const logger = new Logger({ enableStructuredLogging: true });
    logger.info('Test message', { userId: '123', action: 'test' });

    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(logOutput.message).toBe('Test message');
    expect(logOutput.context.userId).toBe('123');
    expect(logOutput.context.action).toBe('test');
  });

  it('should log errors with stack trace', () => {
    const logger = new Logger({ enableStructuredLogging: true });
    const error = new Error('Test error');
    logger.error('Error occurred', error);

    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(logOutput.level).toBe('error');
    expect(logOutput.context.error.message).toBe('Test error');
    expect(logOutput.context.error.stack).toBeDefined();
  });

  it('should respect minimum log level', () => {
    const logger = new Logger({ minLevel: LogLevel.WARN, enableStructuredLogging: true });
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(logOutput.level).toBe('warn');
  });

  it('should set and use persistent context', () => {
    const logger = new Logger({ enableStructuredLogging: true });
    logger.setContext({ requestId: 'req-123', service: 'test' });
    logger.info('Test message');

    const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(logOutput.context.requestId).toBe('req-123');
    expect(logOutput.context.service).toBe('test');
  });

  it('should clear context', () => {
    const logger = new Logger({ enableStructuredLogging: true });
    logger.setContext({ requestId: 'req-123' });
    logger.clearContext();
    logger.info('Test message');

    const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(logOutput.context.requestId).toBeUndefined();
  });

  it('should create child logger with service name', () => {
    const childLogger = createLogger('test-service', { env: 'test' });
    childLogger.info('Test message');

    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
