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

// Batch processing delay to group requests
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private batchSize: number;
  private batchDelayMs: number;
  private processor: (items: T[]) => Promise<R[]>;
  private timeoutId: NodeJS.Timeout | null = null;
  private resolvers: Array<{
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(
    batchSize: number,
    batchDelayMs: number,
    processor: (items: T[]) => Promise<R[]>
  ) {
    this.batchSize = batchSize;
    this.batchDelayMs = batchDelayMs;
    this.processor = processor;
  }

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.batch.push(item);
      this.resolvers.push({ resolve, reject });

      // Process immediately if batch is full
      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      } else {
        // Schedule batch processing if not already scheduled
        if (!this.timeoutId) {
          this.timeoutId = setTimeout(() => {
            this.processBatch();
          }, this.batchDelayMs);
        }
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const currentBatch = this.batch.splice(0);
    const currentResolvers = this.resolvers.splice(0);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    try {
      const results = await this.processor(currentBatch);
      
      for (let i = 0; i < currentResolvers.length; i++) {
        if (results[i] !== undefined) {
          currentResolvers[i].resolve(results[i]);
        } else {
          currentResolvers[i].reject(new Error('No result for batch item'));
        }
      }
    } catch (error) {
      // Reject all pending requests in this batch
      for (const resolver of currentResolvers) {
        resolver.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}
