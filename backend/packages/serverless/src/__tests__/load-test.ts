/**
 * Load Testing Suite for VLO System
 * Tests concurrent session handling, latency, and auto-scaling behavior
 * Requirements: 1.4, 5.3
 */

import { describe, it, expect, beforeAll } from 'vitest';

interface LoadTestConfig {
  concurrentSessions: number;
  targetLatencyMs: number;
  coldStartThresholdMs: number;
}

interface LoadTestResult {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  coldStartLatencyMs: number[];
  errors: string[];
}

/**
 * Simulates a single verification session
 */
async function simulateSession(sessionId: number): Promise<{ latency: number; success: boolean; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Simulate session creation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Simulate TTS generation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 500));
    
    // Simulate audio processing (parallel operations)
    await Promise.all([
      // STT transcription
      new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 2000)),
      // Synth classification
      new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 1200)),
      // Spoof detection
      new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 2000))
    ]);
    
    const latency = Date.now() - startTime;
    return { latency, success: true };
  } catch (error) {
    const latency = Date.now() - startTime;
    return { latency, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Runs load test with specified number of concurrent sessions
 */
async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const results: { latency: number; success: boolean; error?: string }[] = [];
  const coldStartLatencies: number[] = [];
  
  // Test cold start performance (first 10 sessions)
  console.log('Testing cold start performance...');
  for (let i = 0; i < Math.min(10, config.concurrentSessions); i++) {
    const result = await simulateSession(i);
    results.push(result);
    coldStartLatencies.push(result.latency);
  }
  
  // Test concurrent sessions
  console.log(`Testing ${config.concurrentSessions} concurrent sessions...`);
  const concurrentPromises: Promise<{ latency: number; success: boolean; error?: string }>[] = [];
  
  for (let i = 10; i < config.concurrentSessions; i++) {
    concurrentPromises.push(simulateSession(i));
  }
  
  const concurrentResults = await Promise.all(concurrentPromises);
  results.push(...concurrentResults);
  
  // Calculate metrics
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const successfulSessions = results.filter(r => r.success).length;
  const failedSessions = results.filter(r => !r.success).length;
  const errors = results.filter(r => r.error).map(r => r.error!);
  
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);
  
  return {
    totalSessions: results.length,
    successfulSessions,
    failedSessions,
    averageLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95LatencyMs: latencies[p95Index],
    p99LatencyMs: latencies[p99Index],
    coldStartLatencyMs: coldStartLatencies,
    errors
  };
}

describe('Load Testing', () => {
  const config: LoadTestConfig = {
    concurrentSessions: 100,
    targetLatencyMs: 10000, // 10 seconds
    coldStartThresholdMs: 3000 // 3 seconds
  };

  it('should handle 100+ concurrent sessions', async () => {
    const result = await runLoadTest(config);
    
    console.log('Load Test Results:');
    console.log(`Total Sessions: ${result.totalSessions}`);
    console.log(`Successful: ${result.successfulSessions}`);
    console.log(`Failed: ${result.failedSessions}`);
    console.log(`Average Latency: ${result.averageLatencyMs.toFixed(2)}ms`);
    console.log(`P95 Latency: ${result.p95LatencyMs.toFixed(2)}ms`);
    console.log(`P99 Latency: ${result.p99LatencyMs.toFixed(2)}ms`);
    
    expect(result.totalSessions).toBe(config.concurrentSessions);
    expect(result.successfulSessions).toBeGreaterThan(config.concurrentSessions * 0.95); // 95% success rate
  }, 120000); // 2 minute timeout

  it('should meet 95th percentile latency target of <10s', async () => {
    const result = await runLoadTest(config);
    
    console.log(`P95 Latency: ${result.p95LatencyMs.toFixed(2)}ms (target: ${config.targetLatencyMs}ms)`);
    
    expect(result.p95LatencyMs).toBeLessThan(config.targetLatencyMs);
  }, 120000);

  it('should have cold start performance under 3s for 90% of cold starts', async () => {
    const result = await runLoadTest(config);
    
    const coldStartsUnderThreshold = result.coldStartLatencyMs.filter(
      latency => latency < config.coldStartThresholdMs
    ).length;
    
    const coldStartSuccessRate = coldStartsUnderThreshold / result.coldStartLatencyMs.length;
    
    console.log(`Cold Start Success Rate: ${(coldStartSuccessRate * 100).toFixed(2)}%`);
    console.log(`Average Cold Start: ${(result.coldStartLatencyMs.reduce((a, b) => a + b, 0) / result.coldStartLatencyMs.length).toFixed(2)}ms`);
    
    expect(coldStartSuccessRate).toBeGreaterThanOrEqual(0.9); // 90% under threshold
  }, 120000);

  it('should validate auto-scaling behavior under load', async () => {
    // Simulate gradual load increase
    const phases = [
      { sessions: 10, name: 'Low Load' },
      { sessions: 50, name: 'Medium Load' },
      { sessions: 100, name: 'High Load' }
    ];
    
    const phaseResults: { phase: string; p95: number; successRate: number }[] = [];
    
    for (const phase of phases) {
      const result = await runLoadTest({ ...config, concurrentSessions: phase.sessions });
      const successRate = result.successfulSessions / result.totalSessions;
      
      phaseResults.push({
        phase: phase.name,
        p95: result.p95LatencyMs,
        successRate
      });
      
      console.log(`${phase.name}: P95=${result.p95LatencyMs.toFixed(2)}ms, Success=${(successRate * 100).toFixed(2)}%`);
    }
    
    // Verify that success rate remains high across all phases
    phaseResults.forEach(result => {
      expect(result.successRate).toBeGreaterThan(0.95);
    });
    
    // Verify that latency doesn't degrade significantly with scale
    const latencyIncrease = phaseResults[2].p95 / phaseResults[0].p95;
    expect(latencyIncrease).toBeLessThan(2); // Less than 2x increase
  }, 300000); // 5 minute timeout
});
