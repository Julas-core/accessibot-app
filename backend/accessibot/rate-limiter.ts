import { SQLDatabase } from "encore.dev/storage/sqldb";

export const rateLimiterDB = new SQLDatabase("rate-limiter", {
  migrations: "./rate-limiter-migrations",
});

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(): Promise<{ allowed: boolean; resetTime: Date; remaining: number }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    // Clean up old entries
    await rateLimiterDB.exec`
      DELETE FROM rate_limit_requests
      WHERE identifier = ${this.config.identifier}
        AND created_at < ${windowStart}
    `;

    // Count current requests in window
    const result = await rateLimiterDB.queryRow<{ count: string }>`
      SELECT COUNT(*) as count
      FROM rate_limit_requests
      WHERE identifier = ${this.config.identifier}
        AND created_at >= ${windowStart}
    `;

    const currentCount = parseInt(result?.count || '0');
    const remaining = Math.max(0, this.config.maxRequests - currentCount);
    const resetTime = new Date(now.getTime() + this.config.windowMs);

    if (currentCount >= this.config.maxRequests) {
      return {
        allowed: false,
        resetTime,
        remaining: 0,
      };
    }

    // Record this request
    await rateLimiterDB.exec`
      INSERT INTO rate_limit_requests (identifier, created_at)
      VALUES (${this.config.identifier}, ${now})
    `;

    return {
      allowed: true,
      resetTime,
      remaining: remaining - 1,
    };
  }
}

// OpenAI API rate limiter - conservative limits to manage costs
export const openAIRateLimiter = new RateLimiter({
  maxRequests: 50, // 50 requests per hour
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: 'openai-api',
});

export interface PriorityBatchItem<T> {
  item: T;
  priority: number; // Higher number = higher priority
  addedAt: number;
}

export interface BatchProcessorStats {
  totalProcessed: number;
  totalErrors: number;
  averageResponseTime: number;
  currentBatchSize: number;
  errorRate: number;
}

export interface BatchProcessorConfig {
  initialBatchSize: number;
  minBatchSize: number;
  maxBatchSize: number;
  initialDelayMs: number;
  minDelayMs: number;
  maxDelayMs: number;
  targetResponseTimeMs: number;
  maxErrorRate: number;
  adjustmentInterval: number; // Number of batches after which to adjust
}

// Enhanced batch processing with dynamic sizing and priority queuing
export class BatchProcessor<T, R> {
  private queue: PriorityBatchItem<T>[] = [];
  private currentBatchSize: number;
  private currentDelayMs: number;
  private processor: (items: T[]) => Promise<R[]>;
  private timeoutId: NodeJS.Timeout | null = null;
  private resolvers: Array<{
    resolve: (value: R) => void;
    reject: (error: Error) => void;
    priority: number;
  }> = [];
  
  // Performance tracking
  private stats: BatchProcessorStats;
  private responseTimes: number[] = [];
  private batchCount: number = 0;
  private config: BatchProcessorConfig;

  constructor(
    config: BatchProcessorConfig,
    processor: (items: T[]) => Promise<R[]>
  ) {
    this.config = config;
    this.currentBatchSize = config.initialBatchSize;
    this.currentDelayMs = config.initialDelayMs;
    this.processor = processor;
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      currentBatchSize: config.initialBatchSize,
      errorRate: 0,
    };
  }

  async add(item: T, priority: number = 0): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      // Insert item in priority order (higher priority first)
      const priorityItem: PriorityBatchItem<T> = {
        item,
        priority,
        addedAt: Date.now(),
      };

      // Find insertion point to maintain priority order
      let insertIndex = 0;
      while (insertIndex < this.queue.length && this.queue[insertIndex].priority >= priority) {
        insertIndex++;
      }

      this.queue.splice(insertIndex, 0, priorityItem);
      
      // Insert resolver at the same position
      this.resolvers.splice(insertIndex, 0, { resolve, reject, priority });

      // Process immediately if batch is full
      if (this.queue.length >= this.currentBatchSize) {
        this.processBatch();
      } else {
        // Schedule batch processing if not already scheduled
        if (!this.timeoutId) {
          this.timeoutId = setTimeout(() => {
            this.processBatch();
          }, this.currentDelayMs);
        }
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return;

    const batchSize = Math.min(this.currentBatchSize, this.queue.length);
    const currentBatch = this.queue.splice(0, batchSize);
    const currentResolvers = this.resolvers.splice(0, batchSize);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const startTime = Date.now();
    let hadError = false;

    try {
      console.log(`Processing priority batch of ${currentBatch.length} items (priorities: ${currentBatch.map(b => b.priority).join(', ')})`);
      
      const items = currentBatch.map(b => b.item);
      const results = await this.processor(items);
      const responseTime = Date.now() - startTime;
      
      // Update stats
      this.updateStats(responseTime, false);
      
      for (let i = 0; i < currentResolvers.length; i++) {
        if (results[i] !== undefined) {
          currentResolvers[i].resolve(results[i]);
        } else {
          currentResolvers[i].reject(new Error('No result for batch item'));
        }
      }
    } catch (error) {
      hadError = true;
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, true);
      
      // Reject all pending requests in this batch
      for (const resolver of currentResolvers) {
        resolver.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.batchCount++;
    
    // Adjust batch parameters based on performance
    if (this.batchCount % this.config.adjustmentInterval === 0) {
      this.adjustBatchParameters();
    }

    // Process remaining items if any
    if (this.queue.length > 0) {
      this.timeoutId = setTimeout(() => {
        this.processBatch();
      }, this.currentDelayMs);
    }
  }

  private updateStats(responseTime: number, hasError: boolean): void {
    this.stats.totalProcessed++;
    if (hasError) {
      this.stats.totalErrors++;
    }

    // Keep only last 10 response times for rolling average
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 10) {
      this.responseTimes.shift();
    }

    this.stats.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    this.stats.currentBatchSize = this.currentBatchSize;
    this.stats.errorRate = this.stats.totalErrors / this.stats.totalProcessed;
  }

  private adjustBatchParameters(): void {
    const { averageResponseTime, errorRate } = this.stats;
    const { targetResponseTimeMs, maxErrorRate } = this.config;

    console.log(`Batch adjustment - Response time: ${averageResponseTime}ms, Error rate: ${(errorRate * 100).toFixed(1)}%, Current batch size: ${this.currentBatchSize}`);

    // Adjust batch size based on response time and error rate
    if (errorRate > maxErrorRate) {
      // Too many errors - reduce batch size and increase delay
      this.currentBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize * 0.7)
      );
      this.currentDelayMs = Math.min(
        this.config.maxDelayMs,
        Math.floor(this.currentDelayMs * 1.5)
      );
      console.log(`High error rate detected - reducing batch size to ${this.currentBatchSize}, increasing delay to ${this.currentDelayMs}ms`);
    } else if (averageResponseTime > targetResponseTimeMs) {
      // Too slow - reduce batch size
      this.currentBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize * 0.8)
      );
      console.log(`Slow response time detected - reducing batch size to ${this.currentBatchSize}`);
    } else if (averageResponseTime < targetResponseTimeMs * 0.5 && errorRate < maxErrorRate * 0.5) {
      // Fast and reliable - can increase batch size
      this.currentBatchSize = Math.min(
        this.config.maxBatchSize,
        Math.floor(this.currentBatchSize * 1.2)
      );
      this.currentDelayMs = Math.max(
        this.config.minDelayMs,
        Math.floor(this.currentDelayMs * 0.9)
      );
      console.log(`Good performance detected - increasing batch size to ${this.currentBatchSize}, reducing delay to ${this.currentDelayMs}ms`);
    }

    this.stats.currentBatchSize = this.currentBatchSize;
  }

  getStats(): BatchProcessorStats {
    return { ...this.stats };
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getQueueSummary(): { [priority: number]: number } {
    const summary: { [priority: number]: number } = {};
    for (const item of this.queue) {
      summary[item.priority] = (summary[item.priority] || 0) + 1;
    }
    return summary;
  }
}
