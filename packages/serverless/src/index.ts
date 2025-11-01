// Serverless function interfaces and implementations
export * from './interfaces';
export * from './error-handler';
export * from './logger';
export * from './metrics';
export * from './tracing';
export * from './alerting';
export * from './api-gateway';
export * from './auth-middleware';
export * from './cdn-config';
export * from './phrase-bank';
export * from './elevenlabs-client';
export * from './tts-generator';
export * from './audio-storage';
export * from './audio-processor';
export * from './session-storage';
export * from './audit-logger';
export * from './verification-orchestrator';
export * from './stt-transcriber';
// Export classes with different names to avoid conflicts with interfaces
export { SynthClassifier as SynthClassifierImpl } from './synth-classifier';
export { SpoofDetector as SpoofDetectorImpl } from './spoof-detector';
export * from './encryption';
export * from './rate-limiter';
export * from './privacy-controls';
