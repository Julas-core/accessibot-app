import { api } from "encore.dev/api";
import { getBatchProcessorStats } from "./ai-service";

export interface BatchProcessorInfo {
  stats: {
    totalProcessed: number;
    totalErrors: number;
    averageResponseTime: number;
    currentBatchSize: number;
    errorRate: number;
  };
  pendingCount: number;
  queueSummary: { [priority: number]: number };
}

// Get current batch processor statistics and queue status
export const batchProcessorStatus = api<void, BatchProcessorInfo>(
  { expose: true, method: "GET", path: "/batch-processor/status" },
  async () => {
    return getBatchProcessorStats();
  }
);
