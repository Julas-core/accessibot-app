import { api } from "encore.dev/api";
import { cleanupCache } from "./cache";

// Cleanup old cache entries - can be called manually or via cron job
export const cleanupCacheEndpoint = api<void, { success: boolean; message: string }>(
  { expose: true, method: "POST", path: "/cleanup/cache" },
  async () => {
    try {
      await cleanupCache();
      return {
        success: true,
        message: "Cache cleanup completed successfully",
      };
    } catch (error) {
      console.error("Cache cleanup error:", error);
      return {
        success: false,
        message: `Cache cleanup failed: ${error}`,
      };
    }
  }
);
