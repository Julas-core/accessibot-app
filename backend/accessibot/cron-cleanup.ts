import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { cleanupCache, cleanupCacheCustom } from "./cache";

interface CleanupJobPayload {
  // Empty payload for now, can be extended in the future
}

// Standard cache cleanup job endpoint (removes entries older than 30 days)
export const cleanupCacheJob = api<CleanupJobPayload, void>(
  { expose: false, method: "POST", path: "/internal/cleanup-cache" },
  async (payload) => {
    console.log("Starting scheduled cache cleanup job...");
    
    try {
      await cleanupCache();
      console.log("Scheduled cache cleanup completed successfully");
    } catch (error) {
      console.error("Scheduled cache cleanup failed:", error);
      throw error; // Re-throw to mark the cron job as failed
    }
  }
);

// Deep cleanup job endpoint (removes entries older than 7 days)
export const deepCleanupCacheJob = api<CleanupJobPayload, void>(
  { expose: false, method: "POST", path: "/internal/deep-cleanup-cache" },
  async (payload) => {
    console.log("Starting scheduled deep cache cleanup job...");
    
    try {
      // Clean entries older than 7 days for deep cleanup
      await cleanupCacheCustom(7);
      console.log("Scheduled deep cache cleanup completed successfully");
    } catch (error) {
      console.error("Scheduled deep cache cleanup failed:", error);
      throw error; // Re-throw to mark the cron job as failed
    }
  }
);

// Daily cache cleanup job - runs at 2 AM UTC every day
export const dailyCacheCleanup = new CronJob<CleanupJobPayload>("daily-cache-cleanup", {
  title: "Daily Cache Cleanup",
  endpoint: cleanupCacheJob,
  schedule: "0 2 * * *", // Every day at 2:00 AM UTC
});

// Weekly deep cleanup job - runs every Sunday at 1 AM UTC
export const weeklyCacheCleanup = new CronJob<CleanupJobPayload>("weekly-cache-cleanup", {
  title: "Weekly Deep Cache Cleanup", 
  endpoint: deepCleanupCacheJob,
  schedule: "0 1 * * 0", // Every Sunday at 1:00 AM UTC
});
