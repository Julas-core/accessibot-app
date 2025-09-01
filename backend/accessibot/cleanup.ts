import { api } from "encore.dev/api";
import { cleanupCache, cleanupCacheCustom, getCacheStats, defaultCacheConfig } from "./cache";

export interface CleanupRequest {
  intervalDays?: number;
}

export interface CleanupResponse {
  success: boolean;
  message: string;
  entriesRemoved?: number;
}

export interface CacheStatsResponse {
  totalEntries: number;
  entriesLast24h: number;
  entriesLast7d: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  config: {
    defaultTtlDays: number;
    cleanupIntervalDays: number;
    deepCleanupIntervalDays: number;
  };
}

// Cleanup old cache entries - can be called manually or via cron job
export const cleanupCacheEndpoint = api<CleanupRequest, CleanupResponse>(
  { expose: true, method: "POST", path: "/cleanup/cache" },
  async (req) => {
    try {
      let entriesRemoved: number;
      
      if (req.intervalDays && req.intervalDays > 0) {
        // Custom interval cleanup
        entriesRemoved = await cleanupCacheCustom(req.intervalDays);
        return {
          success: true,
          message: `Cache cleanup completed successfully (${req.intervalDays} day interval)`,
          entriesRemoved,
        };
      } else {
        // Standard cleanup using default configuration
        await cleanupCache();
        return {
          success: true,
          message: `Cache cleanup completed successfully (${defaultCacheConfig.cleanupIntervalDays} day interval)`,
        };
      }
    } catch (error) {
      console.error("Cache cleanup error:", error);
      return {
        success: false,
        message: `Cache cleanup failed: ${error}`,
      };
    }
  }
);

// Get cache statistics and configuration
export const getCacheStatsEndpoint = api<void, CacheStatsResponse>(
  { expose: true, method: "GET", path: "/cache/stats" },
  async () => {
    try {
      const stats = await getCacheStats();
      
      return {
        ...stats,
        config: defaultCacheConfig,
      };
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      throw error;
    }
  }
);
