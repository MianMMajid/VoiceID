/**
 * Parallel Processing Optimizer
 * Optimizes Promise.all() coordination for verification checks
 * Task 15.3: Optimize parallel processing
 */

export interface ProcessorTask<T> {
  name: string;
  execute: () => Promise<T>;
  timeoutMs: number;
  priority?: number; // Higher priority tasks start first
  retryable?: boolean;
}

export interface ProcessorResult<T> {
  name: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  retries: number;
}

export interface ParallelProcessorConfig {
  globalTimeoutMs: number;
  enableEarlyExit?: boolean; // Exit early if critical task fails
  maxConcurrency?: number; // Limit concurrent tasks
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * Optimized parallel processor for verification checks
 * Task 15.3: Fine-tune Promise.all() coordination
 */
export class ParallelProcessor {
  private config: ParallelProcessorConfig;

  constructor(config: ParallelProcessorConfig) {
    this.config = {
      enableEarlyExit: false,
      maxConcurrency: Infinity,
      retryAttempts: 0,
      retryDelayMs: 100,
      ...config,
    };
  }

  /**
   * Execute tasks in parallel with optimizations
   * Task 15.3: Optimize parallel processing coordination
   * 
   * Optimizations:
   * - Priority-based execution
   * - Early exit on critical failures
   * - Timeout handling per task and globally
   * - Retry logic for transient failures
   * - Concurrency limiting
   */
  async executeAll<T extends Record<string, any>>(
    tasks: ProcessorTask<any>[]
  ): Promise<Map<string, ProcessorResult<any>>> {
    const results = new Map<string, ProcessorResult<any>>();
    const startTime = Date.now();

    // Sort tasks by priority (higher first)
    const sortedTasks = [...tasks].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );

    // Create global timeout
    const globalTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Global timeout exceeded: ${this.config.globalTimeoutMs}ms`));
      }, this.config.globalTimeoutMs);
    });

    try {
      // Execute with concurrency control
      if (this.config.maxConcurrency && this.config.maxConcurrency < tasks.length) {
        await this.executeBatched(sortedTasks, results, globalTimeoutPromise);
      } else {
        await this.executeParallel(sortedTasks, results, globalTimeoutPromise);
      }
    } catch (error) {
      console.error('Parallel execution failed', {
        error: (error as Error).message,
        duration: Date.now() - startTime,
        completedTasks: results.size,
        totalTasks: tasks.length,
      });
    }

    return results;
  }

  /**
   * Execute all tasks in parallel
   */
  private async executeParallel(
    tasks: ProcessorTask<any>[],
    results: Map<string, ProcessorResult<any>>,
    globalTimeout: Promise<never>
  ): Promise<void> {
    const taskPromises = tasks.map(task => 
      this.executeTask(task, results, globalTimeout)
    );

    if (this.config.enableEarlyExit) {
      // Exit as soon as any critical task fails
      await Promise.race([
        Promise.all(taskPromises),
        this.waitForCriticalFailure(results, tasks),
      ]);
    } else {
      // Wait for all tasks to complete
      await Promise.allSettled(taskPromises);
    }
  }

  /**
   * Execute tasks in batches to limit concurrency
   */
  private async executeBatched(
    tasks: ProcessorTask<any>[],
    results: Map<string, ProcessorResult<any>>,
    globalTimeout: Promise<never>
  ): Promise<void> {
    const batchSize = this.config.maxConcurrency!;
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchPromises = batch.map(task => 
        this.executeTask(task, results, globalTimeout)
      );
      
      await Promise.allSettled(batchPromises);
      
      // Check if we should exit early
      if (this.config.enableEarlyExit && this.hasCriticalFailure(results)) {
        console.log('Early exit due to critical failure');
        break;
      }
    }
  }

  /**
   * Execute single task with timeout and retry
   */
  private async executeTask(
    task: ProcessorTask<any>,
    results: Map<string, ProcessorResult<any>>,
    globalTimeout: Promise<never>
  ): Promise<void> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: Error | undefined;

    while (retries <= (this.config.retryAttempts || 0)) {
      try {
        // Create task-specific timeout
        const taskTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task timeout: ${task.name} (${task.timeoutMs}ms)`));
          }, task.timeoutMs);
        });

        // Execute with both task and global timeout
        const data = await Promise.race([
          task.execute(),
          taskTimeout,
          globalTimeout,
        ]);

        // Success
        results.set(task.name, {
          name: task.name,
          success: true,
          data,
          duration: Date.now() - startTime,
          retries,
        });

        console.log('Task completed', {
          name: task.name,
          duration: Date.now() - startTime,
          retries,
        });

        return;
      } catch (error) {
        lastError = error as Error;
        retries++;

        // Check if retryable
        if (!task.retryable || retries > (this.config.retryAttempts || 0)) {
          break;
        }

        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelayMs)
        );

        console.log('Retrying task', {
          name: task.name,
          attempt: retries,
          error: lastError.message,
        });
      }
    }

    // Failed after retries
    results.set(task.name, {
      name: task.name,
      success: false,
      error: lastError,
      duration: Date.now() - startTime,
      retries: retries - 1,
    });

    console.error('Task failed', {
      name: task.name,
      duration: Date.now() - startTime,
      retries: retries - 1,
      error: lastError?.message,
    });
  }

  /**
   * Wait for critical failure to enable early exit
   */
  private async waitForCriticalFailure(
    results: Map<string, ProcessorResult<any>>,
    tasks: ProcessorTask<any>[]
  ): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.hasCriticalFailure(results)) {
          clearInterval(checkInterval);
          resolve();
        }
        
        // Also resolve if all tasks complete
        if (results.size === tasks.length) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Check if there's a critical failure
   */
  private hasCriticalFailure(results: Map<string, ProcessorResult<any>>): boolean {
    for (const result of results.values()) {
      if (!result.success) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Create optimized parallel processor for verification
 * Task 15.3: Configure optimal settings for verification workflow
 */
export function createVerificationProcessor(
  totalTimeoutMs: number = 10000
): ParallelProcessor {
  return new ParallelProcessor({
    globalTimeoutMs: totalTimeoutMs,
    enableEarlyExit: false, // Don't exit early - we need all checks
    maxConcurrency: 3, // STT, Synth, Spoof run in parallel
    retryAttempts: 1, // One retry for transient failures
    retryDelayMs: 100,
  });
}

/**
 * Helper to create verification tasks
 */
export function createVerificationTasks(
  audioData: Buffer,
  challengePhrase: string,
  processors: {
    stt: { transcribe: (audio: Buffer, phrase: string) => Promise<any> };
    synth: { classify: (audio: Buffer) => Promise<any> };
    spoof: { detect: (audio: Buffer) => Promise<any> };
  }
): ProcessorTask<any>[] {
  return [
    {
      name: 'stt',
      execute: () => processors.stt.transcribe(audioData, challengePhrase),
      timeoutMs: 3000, // 3s for STT
      priority: 3, // Highest priority - fastest check
      retryable: true,
    },
    {
      name: 'synth',
      execute: () => processors.synth.classify(audioData),
      timeoutMs: 2000, // 2s for synth classification
      priority: 2,
      retryable: true,
    },
    {
      name: 'spoof',
      execute: () => processors.spoof.detect(audioData),
      timeoutMs: 3000, // 3s for spoof detection
      priority: 1, // Lowest priority - slowest check
      retryable: false, // Model inference not retryable
    },
  ];
}
